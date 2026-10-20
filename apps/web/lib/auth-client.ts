import { createAuthClient } from "better-auth/react";

// Same origin: Next proxies /api/auth to the Express server.
export const authClient = createAuthClient();
