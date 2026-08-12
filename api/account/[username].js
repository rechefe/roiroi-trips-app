import { sql } from '@vercel/postgres';
import { ensureAccountTables, normalizeUsername, rowToTrip } from '../_account_db.js';

export default async function handler(req, res) {
  const username = normalizeUsername(req.query.username);
  if (!username) return res.status(400).json({ error: 'Missing username' });

  try {
    await ensureAccountTables();

    if (req.method === 'GET') {
      const accountRes = await sql`
        SELECT inventory, custom FROM accounts WHERE username = ${username}
      `;
      const tripsRes = await sql`
        SELECT id, name, answers, packed, personal_packed, shared, share_code, participants, created_at
        FROM user_trips WHERE username = ${username}
        ORDER BY created_at DESC
      `;
      const account = accountRes.rows[0] || { inventory: {}, custom: {} };
      return res.status(200).json({
        inventory: account.inventory || {},
        custom: account.custom || {},
        trips: tripsRes.rows.map(rowToTrip)
      });
    }

    if (req.method === 'PUT') {
      const { inventory, custom, trips } = req.body || {};

      await sql`
        INSERT INTO accounts (username, inventory, custom, updated_at)
        VALUES (${username}, ${JSON.stringify(inventory || {})}::jsonb, ${JSON.stringify(custom || {})}::jsonb, now())
        ON CONFLICT (username) DO UPDATE SET
          inventory = EXCLUDED.inventory,
          custom = EXCLUDED.custom,
          updated_at = now()
      `;

      const incomingTrips = Array.isArray(trips) ? trips : [];
      for (const t of incomingTrips) {
        if (!t || !t.id || !t.name) continue;
        await sql`
          INSERT INTO user_trips (username, id, name, answers, packed, personal_packed, shared, share_code, participants, updated_at)
          VALUES (
            ${username}, ${t.id}, ${t.name},
            ${JSON.stringify(t.answers || {})}::jsonb,
            ${JSON.stringify(t.packed || {})}::jsonb,
            ${JSON.stringify(t.personalPacked || {})}::jsonb,
            ${!!t.shared}, ${t.shareCode || null},
            ${JSON.stringify(t.participants || [])}::jsonb, now()
          )
          ON CONFLICT (username, id) DO UPDATE SET
            name = EXCLUDED.name,
            answers = EXCLUDED.answers,
            packed = EXCLUDED.packed,
            personal_packed = EXCLUDED.personal_packed,
            shared = EXCLUDED.shared,
            share_code = EXCLUDED.share_code,
            participants = EXCLUDED.participants,
            updated_at = now()
        `;
      }

      const incomingIds = incomingTrips.filter(t => t && t.id).map(t => t.id);
      if (incomingIds.length > 0) {
        await sql`
          DELETE FROM user_trips WHERE username = ${username} AND NOT (id = ANY(${incomingIds}))
        `;
      } else {
        await sql`DELETE FROM user_trips WHERE username = ${username}`;
      }

      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'GET, PUT');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
}
