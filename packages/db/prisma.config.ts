import { config } from "dotenv";
import { defineConfig, env } from "prisma/config";

// All env vars live in the repo-root .env; the CLI runs from packages/db.
config({ path: "../../.env" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  // Migrations need a direct (non-pooled) connection.
  datasource: { url: env("DIRECT_URL").trim().replace(/^(['"])(.*)\1$/, "$2") },
});
