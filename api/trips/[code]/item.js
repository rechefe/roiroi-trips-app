import { sql } from '@vercel/postgres';
import { ensureTripsTable, normalizeCode } from '../../_db.js';
import { normalizeUsername } from '../../_account_db.js';

// Atomically claims or releases a single joint item on a shared trip, so two
// people checking the same box at the same moment can't both "win" it.
export default async function handler(req, res) {
  const code = normalizeCode(req.query.code);
  if (!code) return res.status(400).json({ error: 'Missing code' });

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { itemId, checked } = req.body || {};
  const username = normalizeUsername((req.body || {}).username);
  if (!itemId || !username) {
    return res.status(400).json({ error: 'Missing itemId or username' });
  }

  try {
    await ensureTripsTable();

    let rows;
    if (checked) {
      const claim = JSON.stringify({ by: username, at: new Date().toISOString() });
      ({ rows } = await sql`
        UPDATE trips
        SET packed = jsonb_set(packed, ARRAY[${itemId}]::text[], ${claim}::jsonb, true),
            updated_at = now()
        WHERE code = ${code} AND NOT (packed ? ${itemId})
        RETURNING packed, participants, updated_at
      `);
    } else {
      ({ rows } = await sql`
        UPDATE trips
        SET packed = packed - ${itemId},
            updated_at = now()
        WHERE code = ${code} AND packed->${itemId}->>'by' = ${username}
        RETURNING packed, participants, updated_at
      `);
    }

    if (rows.length > 0) {
      return res.status(200).json(rows[0]);
    }

    // Nothing updated: either the trip doesn't exist, or someone else already
    // holds (or already released) this item - tell the client who won.
    const { rows: cur } = await sql`
      SELECT packed, participants, updated_at FROM trips WHERE code = ${code}
    `;
    if (cur.length === 0) return res.status(404).json({ error: 'Not found' });
    return res.status(409).json({
      error: checked ? 'already claimed' : 'not yours to release',
      packed: cur[0].packed,
      participants: cur[0].participants,
      updated_at: cur[0].updated_at
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
}
