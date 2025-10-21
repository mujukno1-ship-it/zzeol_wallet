// api/upbit.js
// Proxy to Upbit REST API with CORS headers
export default async function handler(req, res) {
  try {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' });

    const path = (req.query.path || '').toString();
    if (!path.startsWith('/v1/')) return res.status(400).json({ error: 'Bad path' });

    const upstream = 'https://api.upbit.com' + path;
    const r = await fetch(upstream, { headers: { Accept: 'application/json', 'User-Agent': 'zzeolwallet/7.4.1' }, cache: 'no-store' });
    const text = await r.text();

    res.status(r.status);
    res.setHeader('Content-Type', r.headers.get('content-type') || 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.send(text);
  } catch (e) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(500).json({ error: 'proxy-fail', message: String(e) });
  }
}
