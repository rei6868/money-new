import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

type DrizzleClient = NodePgDatabase<Record<string, never>> & { dispose?: () => Promise<void> };

let cachedDb: DrizzleClient | null = null;
let cachedPool: Pool | null = null;

/**
 * Returns a configured Drizzle client when the DATABASE_URL env var is present.
 * The helper gracefully falls back to `null` to allow API stubs to operate
 * using mock data during local development or CI scaffolding.
 */
export const getDb = (): DrizzleClient | null => {
  if (cachedDb) {
    return cachedDb;
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    return null;
  }

  const ssl =
    process.env.PGSSLMODE === "require" || process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false;

  cachedPool =
    cachedPool ??
    new Pool({
      connectionString,
      ssl,
    });

  cachedDb =
    cachedDb ??
    Object.assign(drizzle(cachedPool), {
      dispose: async () => {
        await cachedPool?.end();
        cachedDb = null;
        cachedPool = null;
      },
    });

  return cachedDb;
};

export const db = getDb();

export const isDbAvailable = (): boolean => Boolean(getDb());

export const teardownDb = async (): Promise<void> => {
  if (cachedPool) {
    await cachedPool.end();
  }
  cachedDb = null;
  cachedPool = null;
};
