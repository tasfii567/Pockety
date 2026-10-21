import { neon } from '@neondatabase/serverless';

export const sql = neon(process.env.DATABASE_URL);

let ready;
export function init() {
  ready ??= (async () => {
    await sql`CREATE TABLE IF NOT EXISTS tx (
      id SERIAL PRIMARY KEY, kind TEXT NOT NULL, amount NUMERIC(14,2) NOT NULL,
      category TEXT, note TEXT, day DATE NOT NULL, created_at TIMESTAMPTZ DEFAULT now())`;
    await sql`CREATE TABLE IF NOT EXISTS settings (k TEXT PRIMARY KEY, v TEXT)`;
  })();
  return ready;
}

export const authed = (req) =>
  !!process.env.APP_KEY && req.headers.get('x-app-key') === process.env.APP_KEY;
