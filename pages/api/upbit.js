export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const fullUrl = req.url || '';
    const match = fullUrl.match(/path=(.+)$/);
    const path = match ? decodeURIComponent(match[1]) : '';

    if (!path.startsWith('/v1/')) {
      return res.status(400).json({ error: 'Invalid path: ' + path });
    }

    const upstream = 'https://api.upbit.com' + path;
    const response = await fetch(upstream, {
      headers: {
        'User-Agent': 'zzeolwallet/1.0',
        'Accept': 'application/json',
      },
      cache: 'no-store',
    });

    const text = await response.text();
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'no-store');
    res.status(response.status).send(text);
  } catch (err) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(500).json({ error: 'proxy-fail', message: String(err) });
  }
}
