export default async function handler(req, res) {
  const target = req.query.url;
  try {
    const response = await fetch(target);
    const text = await response.text();

    // 브라우저 접근 허용
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    res.status(200).send(text);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
