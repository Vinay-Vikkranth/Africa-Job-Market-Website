import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import path from "node:path";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient() {
  const databaseUrl = process.env.DATABASE_URL ?? "file:./dev.db";

  if (databaseUrl.startsWith("postgres://") || databaseUrl.startsWith("postgresql://")) {
    const pool = new Pool({ connectionString: databaseUrl });
    const adapter = new PrismaPg(pool);
    return new PrismaClient({ adapter, log: ["error", "warn"] });
  }

  const relativePath = databaseUrl.replace("file:", "");
  const sqlitePath = path.resolve(/* turbopackIgnore: true */ process.cwd(), relativePath);
  const adapter = new PrismaBetterSqlite3({ url: sqlitePath });
  return new PrismaClient({ adapter, log: ["error", "warn"] });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
