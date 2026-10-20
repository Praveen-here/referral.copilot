import type { RequestHandler } from "express";
import { randomUUID } from "node:crypto";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../auth";
import { HttpError } from "./errors";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Locals {
      requestId: string;
      userId: string;
    }
  }
}

export const requestId: RequestHandler = (_req, res, next) => {
  res.locals.requestId = randomUUID();
  next();
};

export const requireUser: RequestHandler = async (req, res, next) => {
  const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
  if (!session) throw new HttpError(401, "UNAUTHENTICATED", "Please sign in");
  res.locals.userId = session.user.id;
  next();
};
