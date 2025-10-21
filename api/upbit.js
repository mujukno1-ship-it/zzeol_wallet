// /api/upbit.js  — zzeolwallet v6.5 Proxy
export default async function handler(req, res) {
  try {
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const path = req.query.path || '';
    if (typeof path !== 'string' || !path.startsWith('/v1/')) {
      return res.status(400).json({ error: 'Bad path' });
    }

    const upstream = 'https://api.upbit.com' + path;
    const r = await fetch(upstream, {
      headers: { 'User-Agent': 'zzeolwallet/6.5', 'Accept': 'application/json' },
      cache: 'no-store',
    });

    const text = await r.text();
    res.setHeader('Cache-Control', 'no-store');
    res.status(r.status).send(text);
  } catch (e) {
    res.status(500).json({ error: 'proxy-fail', message: String(e) });
  }
}
