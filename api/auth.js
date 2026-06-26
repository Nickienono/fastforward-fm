// POST /api/auth
// Body: { username: string, tag?: string }
// Returns: { username, tag, hasSave, isNew? }

const KV_URL   = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;

async function kvGet(key) {
  const r = await fetch(`${KV_URL}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${KV_TOKEN}` },
  });
  const { result } = await r.json();
  return result != null ? JSON.parse(result) : null;
}

async function kvSet(key, value) {
  await fetch(`${KV_URL}/set/${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KV_TOKEN}` },
    body: JSON.stringify(value),
  });
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!KV_URL || !KV_TOKEN) {
    return res.status(500).json({ error: 'Database niet geconfigureerd. Vercel KV ontbreekt.' });
  }

  const body     = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const { username, tag } = body || {};

  if (!username || username.length < 2 || username.length > 20) {
    return res.status(400).json({ error: 'Gebruikersnaam moet 2-20 tekens zijn.' });
  }
  if (!/^[a-z0-9_]+$/i.test(username)) {
    return res.status(400).json({ error: 'Alleen letters, cijfers en _ zijn toegestaan.' });
  }

  const name = username.toLowerCase();

  if (tag) {
    if (!/^\d{4}$/.test(tag)) {
      return res.status(400).json({ error: 'Tag moet precies 4 cijfers zijn.' });
    }
    const userData = await kvGet(`user:${name}:${tag}`);
    if (!userData) {
      return res.status(404).json({ error: 'Naam of tag klopt niet. Controleer en probeer opnieuw.' });
    }
    return res.json({ username: name, tag, hasSave: !!userData.gameState, lastSave: userData.lastSave || null });
  } else {
    let newTag = null;
    for (let i = 0; i < 20; i++) {
      const candidate = String(Math.floor(1000 + Math.random() * 9000));
      const exists    = await kvGet(`user:${name}:${candidate}`);
      if (!exists) { newTag = candidate; break; }
    }
    if (!newTag) return res.status(500).json({ error: 'Kon geen unieke tag genereren.' });
    await kvSet(`user:${name}:${newTag}`, {
      username: name, tag: newTag, createdAt: new Date().toISOString(), gameState: null, lastSave: null,
    });
    return res.json({ username: name, tag: newTag, hasSave: false, isNew: true });
  }
};