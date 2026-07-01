// POST /api/wipe-all — one-time admin reset: wipes leaderboard + all user gameStates
// Delete this file after use!

const DB_URL    = process.env.FIREBASE_DB_URL;
const DB_SECRET = process.env.FIREBASE_DB_SECRET;

function dbPath(p) { return `${DB_URL}/${p}.json?auth=${DB_SECRET}`; }

async function dbGet(p)  { const r = await fetch(dbPath(p)); return r.ok ? r.json() : null; }
async function dbSet(p, v) { await fetch(dbPath(p), { method:'PUT', headers:{'content-type':'application/json'}, body:JSON.stringify(v) }); }
async function dbDel(p)  { await fetch(dbPath(p), { method:'DELETE' }); }

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'POST only' });
  if (!DB_URL || !DB_SECRET)   return res.status(500).json({ error: 'DB not configured' });

  // 1. Wipe leaderboard
  await dbDel('leaderboard');

  // 2. Reset gameState for all users (keep accounts so login still works)
  const users = await dbGet('users');
  let resetCount = 0;
  if (users) {
    for (const key of Object.keys(users)) {
      const u = users[key];
      if (u && u.gameState !== undefined) {
        await dbSet('users/' + key, {
          ...u,
          gameState:  null,
          lastSave:   null,
          careerId:   null,
          lastActive: new Date().toISOString(),
        });
        resetCount++;
      }
    }
  }

  return res.json({ ok: true, leaderboardWiped: true, usersReset: resetCount });
};
