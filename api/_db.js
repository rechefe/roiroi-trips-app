import { sql } from '@vercel/postgres';

let ensured = false;

export async function ensureTripsTable() {
  if (ensured) return;
  await sql`
    CREATE TABLE IF NOT EXISTS trips (
      code TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      answers JSONB NOT NULL,
      packed JSONB NOT NULL DEFAULT '{}'::jsonb,
      participants JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  // Table may already exist from before "participants" was added.
  await sql`ALTER TABLE trips ADD COLUMN IF NOT EXISTS participants JSONB NOT NULL DEFAULT '[]'::jsonb`;
  ensured = true;
}

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars (0/O, 1/I)

export function generateCode() {
  let code = '';
  for (let i = 0; i < 6; i++) code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return code;
}

export function normalizeCode(raw) {
  return String(raw || '').trim().toUpperCase();
}
