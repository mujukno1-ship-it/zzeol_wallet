export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }
    const path = String(req.query.path || '');
    if (!path.startsWith('/v1/')) {
      return res.status(400).json({ error: 'Bad path' });
    }
    const upstream = 'https://api.upbit.com' + path;

    const r = await fetch(upstream, {
      headers: {
        'User-Agent': 'zzeolwallet/1.0',
        'Accept': 'application/json'
      },
      cache: 'no-store'
    });

    // 프락시 응답 헤더 (CORS 허용)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'no-store');

    if (!r.ok) {
      const text = await r.text().catch(()=>'');
      return res.status(r.status).send(text || `Upbit error: ${r.status}`);
    }

    const text = await r.text();
    res.status(200).send(text);
  } catch (e) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(500).json({ error: 'proxy-fail', message: String(e) });
  }
}
