export default async function handler(req, res) {
  const { endpoint } = req.query;
  try {
    const r = await fetch(`https://api.upbit.com/v1/${endpoint}`);
    const data = await r.json();
    res.status(200).json(data);
  } catch (e) {
    res.status(500).json({ error: 'Upbit fetch error', detail: e.message });
  }
}
