import { ProviderError, type GenerateRequest, type GenerateResult, type LLMProvider } from "../provider";

export function geminiProvider(opts: { apiKey: string; models: Record<"fast" | "quality", string> }): LLMProvider {
  return {
    name: "gemini",
    async generate(req: GenerateRequest, signal?: AbortSignal): Promise<GenerateResult> {
      const model = opts.models[req.tier];
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
      if (!res.ok) throw new ProviderError("gemini", res.status, body.error?.message ?? `HTTP ${res.status}`);
      const text = (body.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("");
      if (!text) throw new ProviderError("gemini", 502, `Empty response (${body.candidates?.[0]?.finishReason ?? "no candidate"})`);
      return { text, model, tokensIn: body.usageMetadata?.promptTokenCount, tokensOut: body.usageMetadata?.candidatesTokenCount };
    },
  };
}
