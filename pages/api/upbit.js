// pages/api/upbit.js
export default async function handler(req, res) {
  const target = req.query.url;
  if (!target) {
    res.status(400).json({ error: "Missing url query param" });
    return;
  }
  try {
    const r = await fetch(target, { cache: "no-store" });
    const text = await r.text();

    // CORS 허용 (브라우저에서 직접 호출 가능)
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    res.status(200).send(text);
  } catch (err) {
    res.status(500).json({ error: err?.message || "proxy failed" });
  }
}
