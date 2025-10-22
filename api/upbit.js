// /api/upbit.js
export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') {
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const path = req.query.path || '';
    if (typeof path !== 'string' || !path.startsWith('/v1/')) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.status(400).json({ error: 'Bad path' });
    }

    const upstream = 'https://api.upbit.com' + path;
    const r = await fetch(upstream, {
      headers: { 'User-Agent': 'zzeolwallet/1.0', Accept: 'application/json' },
      cache: 'no-store',
    });

    const text = await r.text();
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'no-store');

    // 업비트는 대부분 JSON이지만 혹시 모를 텍스트 응답 대비
    try {
      const json = JSON.parse(text);
      return res.status(r.status).json(json);
    } catch {
      return res.status(r.status).send(text);
    }
  } catch (err) {
    console.error('upbit proxy error:', err);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(500).json({ error: String(err?.message || err) });
  }
}
