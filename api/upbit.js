export default async function handler(req, res) {
  try {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    if (req.method !== 'GET') {
      res.status(405).json({ error: 'Method Not Allowed' });
      return;
    }

    const path = (req.query.path || '').toString();
    if (!path.startsWith('/v1/')) {
      res.status(400).json({ error: 'Bad path' });
      return;
    }

    // 캐시무효화를 위해 서버에서 msec 파라미터 추가
    const join = path.includes('?') ? '&' : '?';
    const upstream = 'https://api.upbit.com' + path + join + 'msec=' + Date.now();

    const r = await fetch(upstream, {
      headers: {
        'User-Agent': 'zzeolwallet/7.3',
        'Accept': 'application/json'
      },
      cache: 'no-store'
    });

    const text = await r.text();
    res.status(r.status).send(text);
  } catch (e) {
    res.status(500).json({ error: 'proxy-fail', message: String(e) });
  }
}
