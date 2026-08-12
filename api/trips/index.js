import { sql } from '@vercel/postgres';
import { ensureTripsTable, generateCode } from '../_db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, answers, packed } = req.body || {};
  if (!name || !answers) {
    return res.status(400).json({ error: 'Missing name or answers' });
  }

  try {
    await ensureTripsTable();

    for (let attempt = 0; attempt < 5; attempt++) {
      const code = generateCode();
      try {
        await sql`
          INSERT INTO trips (code, name, answers, packed)
          VALUES (${code}, ${name}, ${JSON.stringify(answers)}::jsonb, ${JSON.stringify(packed || {})}::jsonb)
        `;
        return res.status(201).json({ code });
      } catch (e) {
        if (e && e.code === '23505') continue; // code collision, retry with a new one
        throw e;
      }
    }
    return res.status(500).json({ error: 'Could not generate a unique share code, try again' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
}
