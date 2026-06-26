const KV_URL = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;
async function kvGet(key) {
  const r = await fetch(KV_URL+'/get/'+encodeURIComponent(key), { headers: { Authorization: 'Bearer '+KV_TOKEN } });
  const { result } = await r.json();
  return result != null ? JSON.parse(result) : null;
}
async function kvSet(key, value) {
  await fetch(KV_URL+'/set/'+encodeURIComponent(key), { method:'POST', headers:{Authorization:'Bearer '+KV_TOKEN}, body:JSON.stringify(value) });
}
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  if (req.method==='OPTIONS') return res.status(200).end();
  if (req.method!=='POST') return res.status(405).json({error:'Method not allowed'});
  if (!KV_URL||!KV_TOKEN) return res.status(500).json({error:'Database niet geconfigureerd.'});
  const body = typeof req.body==='string' ? JSON.parse(req.body) : req.body;
  const {username,tag,gameState} = body||{};
  if (!username||!tag||!gameState) return res.status(400).json({error:'username, tag en gameState zijn verplicht.'});
  const key = 'user:'+username+':'+tag;
  const userData = await kvGet(key);
  if (!userData) return res.status(404).json({error:'Gebruiker niet gevonden.'});
  await kvSet(key, {...userData, gameState, lastSave: new Date().toISOString()});
  return res.json({ok:true});
};