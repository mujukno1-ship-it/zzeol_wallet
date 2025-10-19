export default async function handler(req, res) {
  try {
    const { unit='5', m='', count='200' } = req.query;
    if (!m) return res.status(400).json({ error: 'missing m' });
    const url = `https://api.upbit.com/v1/candles/minutes/${unit}?market=${encodeURIComponent(m)}&count=${count}`;
    const r = await fetch(url, { cache: 'no-store' });
    const data = await r.json();
    res.setHeader('Cache-Control', 's-maxage=5, stale-while-revalidate=10');
    res.status(200).json(data);
  } catch (e) {
    res.status(500).json({ error: 'candles proxy failed' });
  }
}
