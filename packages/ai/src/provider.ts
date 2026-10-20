// Provider abstraction (plan §6). Business code asks for a tier, never a model name.

export type Tier = "fast" | "quality";

export interface GenerateRequest {
  system: string;
  prompt: string;
  /** JSON Schema the response must follow. */
  jsonSchema: Record<string, unknown>;
  tier: Tier;
  maxOutputTokens?: number;
}

export interface GenerateResult {
  text: string;
  model: string;
  tokensIn?: number;
  tokensOut?: number;
}

export interface LLMProvider {
  name: "gemini" | "groq" | "mock";
  generate(req: GenerateRequest, signal?: AbortSignal): Promise<GenerateResult>;
}

/** Errors worth retrying on another provider: rate limits, outages, timeouts. */
export class ProviderError extends Error {
  constructor(
    readonly provider: string,
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
  get retryable() {
    return this.status === 0 || this.status === 408 || this.status === 429 || this.status >= 500;
  }
}
