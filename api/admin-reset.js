// POST /api/admin-reset
// Requires { key: ADMIN_RESET_KEY } in body
// Optional { target: "leaderboard" | "users" | "all" } — default "all"

const DB_URL    = process.env.FIREBASE_DB_URL;
const DB_SECRET = process.env.FIREBASE_DB_SECRET;
const RESET_KEY = process.env.ADMIN_RESET_KEY || 'ffm-reset-2024';

function dbPath(path) {
  return `${DB_URL}/${path}.json?auth=${DB_SECRET}`;
}

async function dbDelete(path) {
  const r = await fetch(dbPath(path), { method: 'DELETE' });
  return r.ok;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const { key, target = 'all' } = body || {};

  if (!key || key !== RESET_KEY) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  try {
    const result = {};
    if (target === 'leaderboard' || target === 'all') {
      result.leaderboard = await dbDelete('leaderboard');
    }
    if (target === 'users' || target === 'all') {
      result.users = await dbDelete('users');
    }
    return res.json({ ok: true, ...result, wipedAt: new Date().toISOString() });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
