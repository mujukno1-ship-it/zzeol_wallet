export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const path = req.query.path;
    if (!path || typeof path !== 'string' || !path.startsWith('/v1/')) {
      return res.status(400).json({ error: 'Bad path' });
    }

    const upstream = 'https://api.upbit.com' + path;
    const response = await fetch(upstream, {
      headers: { 'Accept': 'application/json' },
      cache: 'no-store',
    });

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'no-store');

    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).send(text);
    }

    const text = await response.text();
    res.status(200).send(text);
  } catch (err) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(500).json({ error: 'proxy-fail', message: err.toString() });
  }
}
