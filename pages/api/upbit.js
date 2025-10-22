// pages/api/upbit.js
export default async function handler(req, res) {
  const target = req.query.url;
  if (!target) {
    res.status(400).json({ error: "Missing url query param" });
    return;
  }
  try {
    const r = await fetch(target);
    const text = await r.text();
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.status(200).send(text);
  } catch (err) {
    res.status(500).json({ error: err.message || "proxy failed" });
  }
}
