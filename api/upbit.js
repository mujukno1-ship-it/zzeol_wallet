export default async function handler(req, res) {
  const target = req.query.url;
  try {
    const r = await fetch(target);
    const data = await r.text();
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).send(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
