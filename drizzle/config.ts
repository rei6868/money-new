import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required to initialize the Drizzle connection');
}

const ssl =
  process.env.PGSSLMODE === 'require' || process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false;

const pool = new Pool({
  connectionString,
  ssl,
});

export const db = drizzle(pool);
export const connection = pool;
export const drizzleConfig = {
  connectionString,
  directories: {
    migrations: 'drizzle/migrations',
    schemas: 'drizzle/schemas',
    seeds: 'drizzle/seeds',
  },
};
