// /api/upbit.js
export default async function handler(req, res) {
  try {
    // 메서드/에러 헤더
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // /api/upbit?path=/v1/xxx...
    const path = req.query.path || '';
    if (typeof path !== 'string' || !path.startsWith('/v1/')) {
      return res.status(400).json({ error: 'Bad path' });
    }

    const upstream = 'https://api.upbit.com' + path;

    // (중요) 429 대비: 간단 백오프 재시도 2회
    const maxRetry = 2;
    let lastErr;
    for (let i = 0; i <= maxRetry; i++) {
      try {
        const r = await fetch(upstream, {
          headers: {
            'User-Agent': 'zzeolwallet/1.0',
            'Accept': 'application/json'
          },
          cache: 'no-store',
          // 5초 타임아웃
          signal: AbortSignal.timeout(5000)
        });
        // 429면 재시도
        if (r.status === 429 && i < maxRetry) {
          await new Promise(s => setTimeout(s, 600 * (i + 1)));
          continue;
        }
        const text = await r.text();
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cache-Control', 'no-store');
        res.status(r.status).send(text);
        return;
      } catch (e) {
        lastErr = e;
        if (i < maxRetry) {
          await new Promise(s => setTimeout(s, 500 * (i + 1)));
        }
      }
    }

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(500).json({ error: 'proxy-fail', message: String(lastErr) });
  } catch (e) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(500).json({ error: 'proxy-fail', message: String(e) });
  }
}
