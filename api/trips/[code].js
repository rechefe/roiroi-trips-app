import { sql } from '@vercel/postgres';
import { ensureTripsTable, normalizeCode } from '../_db.js';

export default async function handler(req, res) {
  const code = normalizeCode(req.query.code);
  if (!code) return res.status(400).json({ error: 'Missing code' });

  try {
    await ensureTripsTable();

    if (req.method === 'GET') {
      const { rows } = await sql`
        SELECT name, answers, packed, participants, excluded, updated_at FROM trips WHERE code = ${code}
      `;
      if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
      return res.status(200).json(rows[0]);
    }

    if (req.method === 'PATCH') {
      const { name, packed, excluded } = req.body || {};
      const { rows } = await sql`
        UPDATE trips
        SET name = COALESCE(${name ?? null}, name),
            packed = COALESCE(${packed ? JSON.stringify(packed) : null}::jsonb, packed),
            excluded = COALESCE(${excluded ? JSON.stringify(excluded) : null}::jsonb, excluded),
            updated_at = now()
        WHERE code = ${code}
        RETURNING name, answers, packed, participants, excluded, updated_at
      `;
      if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
      return res.status(200).json(rows[0]);
    }

    res.setHeader('Allow', 'GET, PATCH');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
}
