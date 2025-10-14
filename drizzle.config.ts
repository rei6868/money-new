import "dotenv/config";

import type { Config } from "drizzle-kit";

if (!process.env.DB_URL) {
  throw new Error("DB_URL environment variable must be provided for Drizzle configuration.");
}

export default {
  dialect: "postgresql",
  out: "./drizzle",
  schema: "./src/db/schema/index.ts",
  dbCredentials: {
    url: process.env.DB_URL,
  },
  migrations: {
    table: "drizzle_migrations",
    schema: "public",
  },
} satisfies Config;
