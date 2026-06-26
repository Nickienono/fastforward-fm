// POST /api/auth
// Body: { username: string, tag?: string }
// Returns: { username, tag, hasSave, isNew? }

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

// Verwijder accounts die >30 dagen inactief zijn
async function cleanup() {
  try {
    const allUsers = await dbGet('users');
    if (!allUsers) return;
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    for (const [key, user] of Object.entries(allUsers)) {
      const lastActive = user.lastActive ? new Date(user.lastActive).getTime() : new Date(user.createdAt || 0).getTime();
      if (lastActive < cutoff) {
        await fetch(dbPath(`users/${key}`), { method: 'DELETE' });
      }
    }
  } catch (_) { /* cleanup is best-effort */ }
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!DB_URL || !DB_SECRET) {
    return res.status(500).json({ error: 'Database niet geconfigureerd.' });
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const { username, tag } = body || {};

  if (!username || username.length < 2 || username.length > 20) {
    return res.status(400).json({ error: 'Gebruikersnaam moet 2\u201320 tekens zijn.' });
  }
  if (!/^[a-z0-9_]+$/i.test(username)) {
    return res.status(400).json({ error: 'Alleen letters, cijfers en _ zijn toegestaan.' });
  }

  const name = username.toLowerCase();
  cleanup();

  if (tag) {
    if (!/^\d{4}$/.test(tag)) {
      return res.status(400).json({ error: 'Tag moet precies 4 cijfers zijn.' });
    }
    const key      = `${name}_${tag}`;
    const userData = await dbGet(`users/${key}`);
    if (!userData) {
      return res.status(404).json({ error: 'Naam of tag klopt niet. Controleer en probeer opnieuw.' });
    }
    await dbSet(`users/${key}/lastActive`, new Date().toISOString());
    return res.json({
      username: name,
      tag,
      hasSave:  !!userData.gameState,
      lastSave: userData.lastSave || null,
    });
  } else {
    let newTag = null;
    for (let i = 0; i < 20; i++) {
      const candidate = String(Math.floor(1000 + Math.random() * 9000));
      const exists    = await dbGet(`users/${name}_${candidate}`);
      if (!exists) { newTag = candidate; break; }
    }
    if (!newTag) {
      return res.status(500).json({ error: 'Kon geen unieke tag genereren. Probeer een andere naam.' });
    }
    const key = `${name}_${newTag}`;
    await dbSet(`users/${key}`, {
      username:   name,
      tag:        newTag,
      createdAt:  new Date().toISOString(),
      lastActive: new Date().toISOString(),
      gameState:  null,
      lastSave:   null,
    });
    return res.json({ username: name, tag: newTag, hasSave: false, isNew: true });
  }
};
