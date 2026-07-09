// GET  /api/leaderboard  → returns top 50 entries sorted by points desc
// POST /api/leaderboard  → upserts one career entry (keyed by careerId)
// DELETE /api/leaderboard → wipes all entries

const DB_URL    = process.env.FIREBASE_DB_URL;
const DB_SECRET = process.env.FIREBASE_DB_SECRET;

function dbPath(path) {
  return `${DB_URL}/${path}.json?auth=${DB_SECRET}`;
}

async function dbGet(path) {
  const r = await fetch(dbPath(path));
  if (!r.ok) return null;
  return r.json();
}

async function dbSet(path, value) {
  const r = await fetch(dbPath(path), {
    method:  'PUT',
    headers: { 'content-type': 'application/json' },
    body:    JSON.stringify(value),
  });
  return r.ok;
}

async function dbDelete(path) {
  const r = await fetch(dbPath(path), { method: 'DELETE' });
  return r.ok;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!DB_URL || !DB_SECRET) {
    return res.status(500).json({ error: 'Database niet geconfigureerd.' });
  }

  // ── GET: return sorted leaderboard ──
  if (req.method === 'GET') {
    const data = await dbGet('leaderboard');
    if (!data) return res.json({ entries: [] });
    const entries = Object.values(data)
      .sort((a, b) => b.points - a.points || b.seasons - a.seasons)
      .slice(0, 50);
    return res.json({ entries });
  }

  // ── POST: upsert career entry ──
  if (req.method === 'POST') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { careerId, playerName, club, seasons, points, titles } = body || {};

    if (!careerId || !playerName || !club) {
      return res.status(400).json({ error: 'careerId, playerName en club zijn verplicht.' });
    }

    await dbSet(`leaderboard/${careerId}`, {
      careerId,
      playerName,
      club,
      seasons:   seasons   || 0,
      points:    points    || 0,
      titles:    titles    || 0,
      updatedAt: new Date().toISOString(),
    });

    return res.json({ ok: true });
  }

  // ── DELETE: wipe entire leaderboard ──
  if (req.method === 'DELETE') {
    await dbDelete('leaderboard');
    return res.json({ ok: true, wiped: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
