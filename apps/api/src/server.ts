// Must stay first: loads .env before any module (like @rc/db) reads process.env.
import { env } from "./env";
import express from "express";
import { toNodeHandler } from "better-auth/node";
import { prisma } from "@rc/db";
import { auth } from "./auth";
import { errorHandler } from "./http/errors";
import { requestId, requireUser } from "./http/middleware";
import { maybeStartScan } from "./services/openings";
import { v1 } from "./routes/v1";

const app = express();
app.disable("x-powered-by");
app.use(requestId);

// Better Auth reads the raw body itself, so it is mounted before express.json().
app.all("/api/auth/*splat", toNodeHandler(auth));

app.use(express.json({ limit: "200kb" }));

app.get("/healthz", (_req, res) => {
  res.json({ ok: true });
});
app.get("/readyz", async (_req, res) => {
  await prisma.$queryRaw`SELECT 1`;
  res.json({ ok: true });
});

// Outside scheduler hook: starts a job-feed scan if the last one is over 30 minutes old.
// Off unless CRON_SECRET is set; the key goes in an `x-cron-key` header (or `?key=`).
const cronOpenings: express.RequestHandler = async (req, res) => {
  const key = req.get("x-cron-key") ?? req.query.key;
  if (!env.CRON_SECRET || key !== env.CRON_SECRET) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Not found" } });
    return;
  }
  res.status(202).json({ scanning: await maybeStartScan(30 * 60_000) });
};
app.get("/api/cron/openings", cronOpenings);
app.post("/api/cron/openings", cronOpenings);

app.use("/api/v1", requireUser, v1);
app.use(errorHandler);

app.listen(env.API_PORT, () => {
  console.log(`API listening on http://localhost:${env.API_PORT}`);
});
