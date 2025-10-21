export default async function handler(req, res) {
  try {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }

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
      headers: {
        'User-Agent': 'zzeolwallet/6.3-backup',
        'Accept': 'application/json'
      },
      cache: 'no-store'
    });

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
