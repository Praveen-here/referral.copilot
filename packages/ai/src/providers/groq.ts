import { ProviderError, type GenerateRequest, type GenerateResult, type LLMProvider } from "../provider";

/** Groq's OpenAI-compatible chat API, used as the fallback provider. */
export function groqProvider(opts: { apiKey: string; model: string }): LLMProvider {
  return {
    name: "groq",
    async generate(req: GenerateRequest, signal?: AbortSignal): Promise<GenerateResult> {
      let res: Response;
      try {
        res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          signal,
          headers: { authorization: `Bearer ${opts.apiKey}`, "content-type": "application/json" },
          body: JSON.stringify({
            model: opts.model,
            messages: [
              { role: "system", content: `${req.system}\n\nRespond with JSON only, matching this JSON Schema:\n${JSON.stringify(req.jsonSchema)}` },
              { role: "user", content: req.prompt },
            ],
            response_format: { type: "json_object" },
            max_completion_tokens: req.maxOutputTokens ?? 8192,
            temperature: req.tier === "quality" ? 0.7 : 0.2,
          }),
        });
      } catch (e) {
        throw new ProviderError("groq", 0, (e as Error).message);
      }
      const body = (await res.json().catch(() => ({}))) as {
        error?: { message?: string };
        choices?: { message?: { content?: string } }[];
        usage?: { prompt_tokens?: number; completion_tokens?: number };
      };
      if (!res.ok) throw new ProviderError("groq", res.status, body.error?.message ?? `HTTP ${res.status}`);
      const text = body.choices?.[0]?.message?.content ?? "";
      if (!text) throw new ProviderError("groq", 502, "Empty response");
      return { text, model: opts.model, tokensIn: body.usage?.prompt_tokens, tokensOut: body.usage?.completion_tokens };
    },
  };
}
