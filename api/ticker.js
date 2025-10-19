export default async function handler(req, res) {
  try {
    const ms = (req.query.ms || '').split(',').filter(Boolean);
    if (!ms.length) return res.status(400).json({ error: 'missing ms' });
    const url = 'https://api.upbit.com/v1/ticker?markets=' + ms.join(',');
    const r = await fetch(url, { cache: 'no-store' });
    const data = await r.json();
    res.setHeader('Cache-Control', 's-maxage=5, stale-while-revalidate=10');
    res.status(200).json(data);
  } catch (e) {
    res.status(500).json({ error: 'ticker proxy failed' });
  }
}
