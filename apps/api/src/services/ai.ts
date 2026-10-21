import { geminiProvider, groqProvider, runTask, type AiTask, type LLMProvider } from "@rc/ai";
import { prisma } from "@rc/db";
import { env } from "../env";

const geminiFallbacks = env.GEMINI_MODEL_FALLBACKS.split(",").map((m) => m.trim()).filter(Boolean);
const geminiModels = (main: string) => [main, ...geminiFallbacks.filter((m) => m !== main)];

const providers: LLMProvider[] = [
  ...(env.GEMINI_API_KEY
    ? [geminiProvider({ apiKey: env.GEMINI_API_KEY, models: { fast: geminiModels(env.GEMINI_MODEL_FAST), quality: geminiModels(env.GEMINI_MODEL_QUALITY) } })]
    : []),
  ...(env.GROQ_API_KEY ? [groqProvider({ apiKey: env.GROQ_API_KEY, model: env.GROQ_MODEL })] : []),
];

/** Runs an AI task for a user, logging every attempt to ai_runs (plan §20). */
export function runAi<T>(userId: string, task: AiTask<T>) {
  return runTask(task, {
    providers,
    timeoutMs: 60_000,
    log: (a) =>
      prisma.aiRun
        .create({
          data: {
            userId,
            task: a.task,
            provider: a.provider,
            model: a.model,
            promptVersion: a.promptVersion,
            inputHash: a.inputHash,
            output: (a.output ?? undefined) as object | undefined,
            validationStatus: a.validationStatus,
            tokensIn: a.tokensIn,
            tokensOut: a.tokensOut,
            latencyMs: a.latencyMs,
            fellBack: a.fellBack,
            error: a.error,
          },
        })
        .then(() => undefined, (e) => console.error("ai_run log failed", e)),
  });
}
