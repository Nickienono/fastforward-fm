// GET /api/monthly-reset -- called by Vercel Cron on 1st of each month at 00:00 UTC
const DB_URL = process.env.FIREBASE_DB_URL;
const DB_SECRET = process.env.FIREBASE_DB_SECRET;

function dbPath(p) { return DB_URL+'/'+p+'.json?auth='+DB_SECRET; }
async function dbGet(p)    { const r = await fetch(dbPath(p)); return r.ok ? r.json() : null; }
async function dbSet(p, v) { await fetch(dbPath(p), { method:'PUT', headers:{'content-type':'application/json'}, body:JSON.stringify(v) }); }
async function dbDel(p)    { await fetch(dbPath(p), { method:'DELETE' }); }

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET')    return res.status(405).json({ error: 'GET only' });
  if (!DB_URL || !DB_SECRET)   return res.status(500).json({ error: 'DB not configured' });

  const meta   = await dbGet('meta') || {};
  const season = meta.currentSeason || 1;

  const lbData = await dbGet('leaderboard');
  const top3   = lbData
    ? Object.values(lbData).sort((a,b) => b.points-a.points || b.seasons-a.seasons).slice(0,3).map((e,i) => ({...e, rank: i+1}))
    : [];

  await dbSet('hallOfFame/season'+season, { seasonNumber: season, closedAt: new Date().toISOString(), top3 });
  await dbDel('leaderboard');
  await dbSet('meta', Object.assign({}, meta, { currentSeason: season+1, seasonStarted: new Date().toISOString() }));

  return res.json({ ok: true, closedSeason: season, newSeason: season+1, top3Saved: top3.length });
};
