import { ProviderError, type GenerateRequest, type GenerateResult, type LLMProvider } from "../provider";

/**
 * Gemini with per-tier model lists. Free-tier quotas are per model, so on a 429 we try
 * the next model before giving up (and letting runTask fall back to Groq).
 */
export function geminiProvider(opts: { apiKey: string; models: Record<"fast" | "quality", string[]> }): LLMProvider {
  async function call(model: string, req: GenerateRequest, signal?: AbortSignal): Promise<GenerateResult> {
    let res: Response;
    try {
      res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: "POST",
        signal,
        headers: { "x-goog-api-key": opts.apiKey, "content-type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: req.system }] },
          contents: [{ role: "user", parts: [{ text: req.prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            responseJsonSchema: req.jsonSchema,
            maxOutputTokens: req.maxOutputTokens ?? 8192,
            temperature: req.tier === "quality" ? 0.7 : 0.2,
            // Default thinking adds seconds; extraction needs none, writing needs a little.
            thinkingConfig: { thinkingLevel: req.tier === "quality" ? "low" : "minimal" },
          },
        }),
      });
    } catch (e) {
      throw new ProviderError("gemini", 0, (e as Error).message);
    }
    const body = (await res.json().catch(() => ({}))) as {
      error?: { message?: string };
      candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
      usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
    };
    if (!res.ok) throw new ProviderError("gemini", res.status, `${model}: ${body.error?.message ?? `HTTP ${res.status}`}`);
    const text = (body.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("");
    if (!text) throw new ProviderError("gemini", 502, `${model}: empty response (${body.candidates?.[0]?.finishReason ?? "no candidate"})`);
    return { text, model, tokensIn: body.usageMetadata?.promptTokenCount, tokensOut: body.usageMetadata?.candidatesTokenCount };
  }

  return {
    name: "gemini",
    async generate(req, signal) {
      const models = opts.models[req.tier];
      let last: unknown;
      for (const model of models) {
        try {
          return await call(model, req, signal);
        } catch (e) {
          last = e;
          // Only a quota/rate limit is model-specific; other errors won't improve on another model.
          if (!(e instanceof ProviderError && e.status === 429)) throw e;
        }
      }
      throw last;
    },
  };
}
