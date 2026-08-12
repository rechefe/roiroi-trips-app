import { sql } from '@vercel/postgres';
import { ensureTripsTable, normalizeCode } from '../../_db.js';
import { normalizeUsername } from '../../_account_db.js';

// Registers a username as a participant of a shared trip (idempotent), so the
// trip can show who's actually coming.
export default async function handler(req, res) {
  const code = normalizeCode(req.query.code);
  if (!code) return res.status(400).json({ error: 'Missing code' });

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const username = normalizeUsername((req.body || {}).username);
  if (!username) return res.status(400).json({ error: 'Missing username' });

  try {
    await ensureTripsTable();
    const { rows } = await sql`
      UPDATE trips
      SET participants = CASE
            WHEN participants @> to_jsonb(ARRAY[${username}]::text[])
            THEN participants
            ELSE participants || to_jsonb(ARRAY[${username}]::text[])
          END,
          updated_at = now()
      WHERE code = ${code}
      RETURNING participants
    `;
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    return res.status(200).json({ participants: rows[0].participants });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
}
