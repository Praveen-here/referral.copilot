import { createHash } from "node:crypto";
import { z } from "zod";
import type { LLMProvider, Tier } from "./provider";

export interface AiTask<T> {
  /** Stable task name for logs, e.g. "ANALYZE_JOB". */
  task: string;
  promptVersion: string;
  system: string;
  prompt: string;
  schema: z.ZodType<T>;
  tier: Tier;
  maxOutputTokens?: number;
}

export interface AiAttempt {
  task: string;
  provider: string;
  model: string;
  promptVersion: string;
  inputHash: string;
  output: unknown;
  validationStatus: "OK" | "INVALID" | "ERROR";
  tokensIn?: number;
  tokensOut?: number;
  latencyMs: number;
  fellBack: boolean;
  error?: string;
}

export interface AiRuntime {
  /** In priority order: primary first, fallbacks after. */
  providers: LLMProvider[];
  log?: (attempt: AiAttempt) => void | Promise<void>;
  timeoutMs?: number;
}

export class AiUnavailableError extends Error {}

const toJsonSchema = (schema: z.ZodType) => {
  const json = z.toJSONSchema(schema) as Record<string, unknown>;
  delete json.$schema;
  return json;
};

/**
 * Runs one structured AI task: validate against the schema, repair once on
 * invalid output, fall back to the next provider on rate limits or outages.
 */
export async function runTask<T>(task: AiTask<T>, rt: AiRuntime): Promise<{ data: T; provider: string; model: string; fellBack: boolean }> {
  if (rt.providers.length === 0) throw new AiUnavailableError("No AI provider is configured");
  const jsonSchema = toJsonSchema(task.schema);
  const inputHash = createHash("sha256").update(`${task.promptVersion}\n${task.system}\n${task.prompt}`).digest("hex");
  let lastError = "unknown";

  for (const [index, provider] of rt.providers.entries()) {
    let prompt = task.prompt;
    for (let attempt = 0; attempt < 2; attempt++) {
      const started = Date.now();
      const base = { task: task.task, provider: provider.name, promptVersion: task.promptVersion, inputHash, fellBack: index > 0 };
      try {
        const result = await provider.generate(
          { system: task.system, prompt, jsonSchema, tier: task.tier, maxOutputTokens: task.maxOutputTokens },
          AbortSignal.timeout(rt.timeoutMs ?? 60_000),
        );
        const parsed = task.schema.safeParse(safeJson(result.text));
        await rt.log?.({
          ...base,
          model: result.model,
          output: parsed.success ? parsed.data : result.text.slice(0, 4000),
          validationStatus: parsed.success ? "OK" : "INVALID",
          tokensIn: result.tokensIn,
          tokensOut: result.tokensOut,
          latencyMs: Date.now() - started,
        });
        if (parsed.success) return { data: parsed.data, provider: provider.name, model: result.model, fellBack: index > 0 };
        lastError = `invalid output: ${parsed.error.issues.slice(0, 3).map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`;
        // One repair attempt with the validation errors.
        prompt = `${task.prompt}\n\nYour previous answer did not match the required JSON schema (${lastError}). Return corrected JSON only.`;
      } catch (e) {
        lastError = e instanceof Error ? e.message : String(e);
        await rt.log?.({ ...base, model: "?", output: null, validationStatus: "ERROR", latencyMs: Date.now() - started, error: lastError.slice(0, 500) });
        // Rate limits, outages and bad requests all move on to the next provider;
        // only invalid JSON earns a repair attempt on the same one.
        break;
      }
    }
  }
  throw new AiUnavailableError(`AI task ${task.task} failed: ${lastError}`);
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    // Some models wrap JSON in a code fence.
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return undefined;
    try {
      return JSON.parse(match[0]);
    } catch {
      return undefined;
    }
  }
}
