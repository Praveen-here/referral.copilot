import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import { z } from "zod";

// Single .env at the repo root, shared by the API and Prisma CLI.
config({ path: fileURLToPath(new URL("../../../.env", import.meta.url)), quiet: true });

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  // Not PORT: hosts like Render assign PORT to the public web server; the API stays internal.
  API_PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  BETTER_AUTH_SECRET: z.string().min(32, "BETTER_AUTH_SECRET should be at least 32 characters"),
  BETTER_AUTH_URL: z.url(),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  GEMINI_API_KEY: z.string().optional(),
  GROQ_API_KEY: z.string().optional(),
  // Model names change often; override here without touching code (plan §6.1).
  // flash-lite measured 4–19s per call vs ~2s for flash with minimal thinking (2026-10-20).
  GEMINI_MODEL_FAST: z.string().default("gemini-3.5-flash"),
  GEMINI_MODEL_QUALITY: z.string().default("gemini-3.5-flash"),
  GROQ_MODEL: z.string().default("openai/gpt-oss-120b"),
  // People search: Serper (Google results) preferred, Tavily as an alternative.
  SERPER_API_KEY: z.string().optional(),
  TAVILY_API_KEY: z.string().optional(),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  // Print variable names only, never values.
  const names = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("\n  ");
  console.error(`Invalid environment configuration:\n  ${names}`);
  process.exit(1);
}

export const env = parsed.data;
