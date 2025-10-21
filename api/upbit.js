// api/upbit.js
// Vercel Serverless Function (GET only)
// Proxy to Upbit REST API with CORS + no-store + simple rate protection

export default async function handler(req, res) {
  try {
    // CORS (모든 응답에 추가)
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

    // 요청 경로 검증: /api/upbit?path=/v1/...
    const path = (req.query.path || '').toString();
    if (!path.startsWith('/v1/')) {
      res.status(400).json({ error: 'Bad path' });
      return;
    }

    // 간단한 초당 요청 제한 (엣지에서 과도 호출 방지)
    res.setHeader('Cache-Control', 'no-store');

    const upstream = 'https://api.upbit.com' + path;

    // Upbit 호출
    const r = await fetch(upstream, {
      headers: {
        'User-Agent': 'zzeolwallet/1.0',
        'Accept': 'application/json'
      }
    });

    // Upbit 응답 그대로 전달
    const text = await r.text();
    // 상태/헤더 전달
    res.status(r.status);
    res.setHeader('Content-Type', r.headers.get('content-type') || 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.send(text);
  } catch (e) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(500).json({ error: 'proxy-fail', message: String(e) });
  }
}
