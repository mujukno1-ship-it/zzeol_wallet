export default async function handler(req, res) {
  const url = "https://api.upbit.com/v1/market/all";  // 예시 URL
  try {
    const r = await fetch(url);
    const data = await r.json();
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
