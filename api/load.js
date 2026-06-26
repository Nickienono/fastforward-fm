const KV_URL = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;
async function kvGet(key) {
  const r = await fetch(KV_URL+'/get/'+encodeURIComponent(key), { headers:{Authorization:'Bearer '+KV_TOKEN} });
  const {result} = await r.json();
  return result!=null ? JSON.parse(result) : null;
}
module.exports = async function handler(req,res) {
  res.setHeader('Access-Control-Allow-Origin','*');
  if (req.method!=='GET') return res.status(405).json({error:'Method not allowed'});
  if (!KV_URL||!KV_TOKEN) return res.status(500).json({error:'Database niet geconfigureerd.'});
  const {username,tag} = req.query||{};
  if (!username||!tag) return res.status(400).json({error:'username en tag zijn verplicht.'});
  const userData = await kvGet('user:'+username+':'+tag);
  if (!userData) return res.status(404).json({error:'Gebruiker niet gevonden.'});
  return res.json({gameState: userData.gameState||null});
};