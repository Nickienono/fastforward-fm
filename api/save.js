// POST /api/save
// Body: { username, tag, gameState }

const DB_URL    = process.env.FIREBASE_DB_URL;
const DB_SECRET = process.env.FIREBASE_DB_SECRET;

function dbPath(path) {
  return `${DB_URL}/${path}.json?auth=${DB_SECRET}`;
}

async function dbGet(path) {
  const r = await fetch(dbPath(path));
  if (!r.ok) return null;
  const data = await r.json();
  return data;
}

async function dbSet(path, value) {
  await fetch(dbPath(path), {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(value),
  });
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!DB_URL || !DB_SECRET) return res.status(500).json({ error: 'Database niet geconfigureerd.' });

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const { username, tag, gameState } = body || {};

  if (!username || !tag || !gameState) {
    return res.status(400).json({ error: 'username, tag en gameState zijn verplicht.' });
  }

  const key      = `${username}_${tag}`;
  const userData = await dbGet(`users/${key}`);
  if (!userData) return res.status(404).json({ error: 'Gebruiker niet gevonden.' });

  await dbSet(`users/${key}`, {
    ...userData,
    gameState,
    lastSave:   new Date().toISOString(),
    lastActive: new Date().toISOString(),
  });

  return res.json({ ok: true });
};
