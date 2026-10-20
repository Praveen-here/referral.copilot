// Must stay first: loads .env before any module (like @rc/db) reads process.env.
import { env } from "./env";
import express from "express";
import { toNodeHandler } from "better-auth/node";
import { prisma } from "@rc/db";
import { auth } from "./auth";
import { errorHandler } from "./http/errors";
import { requestId, requireUser } from "./http/middleware";
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

app.use("/api/v1", requireUser, v1);
app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`API listening on http://localhost:${env.PORT}`);
});
