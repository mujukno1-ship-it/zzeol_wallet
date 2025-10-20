// pages/api/upbit.js
export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') {
      res.status(405).json({ error: 'Method Not Allowed' });
      return;
    }

    const path = req.query.path || '';
    if (typeof path !== 'string' || !path.startsWith('/v1/')) {
      res.status(400).json({ error: 'Bad path' });
      return;
    }

    const upstream = 'https://api.upbit.com' + path;
    const r = await fetch(upstream, {
      headers: { 'User-Agent': 'zzeolwallet/1.0', 'Accept': 'application/json' },
      cache: 'no-store',
    });

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'no-store');
    res.status(r.status);
    const text = await r.text();
    res.send(text);
  } catch (e) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(500).json({ error: 'proxy-fail', message: String(e) });
  }
}
