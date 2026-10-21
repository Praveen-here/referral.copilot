import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/client";

export * from "../generated/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  // Hosting dashboards keep quotes/whitespace pasted around a value; strip them so a
  // copied `"postgresql://…"` doesn't turn into a garbled URL (seen on Render: P1000).
  const connectionString = process.env.DATABASE_URL?.trim().replace(/^(['"])(.*)\1$/, "$2");
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  if (!/^postgres(ql)?:\/\//.test(connectionString)) throw new Error("DATABASE_URL must start with postgresql://");
  // pg already treats `require` as `verify-full`; saying so explicitly silences its upgrade warning.
  const url = connectionString.replace("sslmode=require", "sslmode=verify-full");
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: url }),
    // Prisma's 2s/5s defaults assume a nearby database; each round trip to Neon
    // is ~150ms, so a few overlapping transactions can wait longer than 2s.
    transactionOptions: { maxWait: 10_000, timeout: 20_000 },
  });
}

// One client per process; reuse across hot reloads in dev.
export const prisma = globalForPrisma.prisma ?? createClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
