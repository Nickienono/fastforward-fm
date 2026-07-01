// GET /api/hall-of-fame — returns all past seasons + current season number
const DB_URL    = process.env.FIREBASE_DB_URL;
const DB_SECRET = process.env.FIREBASE_DB_SECRET;

function dbPath(p) { return `${DB_URL}/${p}.json?auth=${DB_SECRET}`; }
async function dbGet(p) { const r = await fetch(dbPath(p)); return r.ok ? r.json() : null; }

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET')    return res.status(405).json({ error: 'GET only' });
  if (!DB_URL || !DB_SECRET)   return res.status(500).json({ error: 'DB not configured' });

  const [hofData, meta] = await Promise.all([
    dbGet('hallOfFame'),
    dbGet('meta'),
  ]);

  const seasons = hofData
    ? Object.values(hofData).sort((a, b) => b.seasonNumber - a.seasonNumber)
    : [];

  return res.json({
    currentSeason: (meta && meta.currentSeason) || 1,
    seasonStarted: (meta && meta.seasonStarted)  || null,
    seasons,
  });
};
