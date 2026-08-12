import { sql } from '@vercel/postgres';

let ensured = false;

export async function ensureAccountTables() {
  if (ensured) return;
  await sql`
    CREATE TABLE IF NOT EXISTS accounts (
      username TEXT PRIMARY KEY,
      inventory JSONB NOT NULL DEFAULT '{}'::jsonb,
      custom JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS user_trips (
      username TEXT NOT NULL,
      id TEXT NOT NULL,
      name TEXT NOT NULL,
      answers JSONB NOT NULL,
      packed JSONB NOT NULL DEFAULT '{}'::jsonb,
      personal_packed JSONB NOT NULL DEFAULT '{}'::jsonb,
      shared BOOLEAN NOT NULL DEFAULT false,
      share_code TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (username, id)
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS user_trips_username_idx ON user_trips (username)`;
  ensured = true;
}

// The display name a person types in (e.g. "Eyal") is what's kept locally and
// shown in the UI. The server only ever sees this normalized form, used as the
// account's primary key - this is a low-friction identifier, not a password.
export function normalizeUsername(raw) {
  return String(raw || '').trim().toLowerCase();
}

export function rowToTrip(row) {
  return {
    id: row.id,
    name: row.name,
    answers: row.answers,
    packed: row.packed || {},
    personalPacked: row.personal_packed || {},
    shared: !!row.shared,
    shareCode: row.share_code || null,
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now()
  };
}
