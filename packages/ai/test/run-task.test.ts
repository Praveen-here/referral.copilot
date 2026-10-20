import { describe, expect, it } from "vitest";
import { z } from "zod";
import { AiUnavailableError, ProviderError, runTask, type AiAttempt, type LLMProvider } from "../src";

const task = { task: "T", promptVersion: "t/v1", system: "s", prompt: "p", tier: "fast" as const, schema: z.object({ n: z.number() }) };

const provider = (name: "gemini" | "groq", replies: (string | ProviderError)[]): LLMProvider & { calls: number } => {
  const p = {
    name,
    calls: 0,
    async generate() {
      const r = replies[Math.min(p.calls++, replies.length - 1)]!;
      if (r instanceof ProviderError) throw r;
      return { text: r, model: `${name}-model` };
    },
  };
  return p;
};

describe("runTask", () => {
  it("returns valid output from the primary", async () => {
    const r = await runTask(task, { providers: [provider("gemini", ['{"n":1}'])] });
    expect(r).toMatchObject({ data: { n: 1 }, provider: "gemini", fellBack: false });
  });

  it("repairs invalid output once on the same provider", async () => {
    const gemini = provider("gemini", ['{"n":"one"}', '```json\n{"n":2}\n```']);
    const r = await runTask(task, { providers: [gemini] });
    expect(r.data).toEqual({ n: 2 });
    expect(gemini.calls).toBe(2);
  });

  it("falls back to Groq on a rate limit and logs both attempts", async () => {
    const log: AiAttempt[] = [];
    const r = await runTask(task, {
      providers: [provider("gemini", [new ProviderError("gemini", 429, "quota")]), provider("groq", ['{"n":3}'])],
      log: (a) => void log.push(a),
    });
    expect(r).toMatchObject({ data: { n: 3 }, provider: "groq", fellBack: true });
    expect(log.map((a) => a.validationStatus)).toEqual(["ERROR", "OK"]);
  });

  it("fails clearly when every provider fails", async () => {
    await expect(
      runTask(task, { providers: [provider("gemini", [new ProviderError("gemini", 503, "down")]), provider("groq", ["nope", "still nope"])] }),
    ).rejects.toBeInstanceOf(AiUnavailableError);
  });
});
