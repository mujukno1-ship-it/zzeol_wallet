// /api/upbit.js
export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') {
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const path = req.query.path || '';
    // 허용: /v1/* 만 프록시
    if (typeof path !== 'string' || !path.startsWith('/v1/')) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.status(400).json({ error: 'Bad path' });
    }

    const upstream = 'https://api.upbit.com' + path;
    const r = await fetch(upstream, {
      // 사용자 에이전트 지정 & 캐시 방지
      headers: { 'User-Agent': 'zzeolwallet/1.0', 'Accept': 'application/json' },
      cache: 'no-store',
      // vercel edge 캐시 방지
      next: { revalidate: 0 },
    });

    const text = await r.text();

    // CORS, 캐시 방지
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    res.status(r.status).send(text);
  } catch (e) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(500).json({ error: 'proxy-fail', message: String(e) });
  }
}
