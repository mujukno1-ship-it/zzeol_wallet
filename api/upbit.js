// /api/upbit.js
export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      res.setHeader("Access-Control-Allow-Origin", "*");
      return res.status(405).json({ error: "Method Not Allowed" });
    }

    const { path } = req.query;
    if (!path || typeof path !== "string") {
      res.setHeader("Access-Control-Allow-Origin", "*");
      return res.status(400).json({ error: "Missing `path` query" });
    }

    const upstream = `https://api.upbit.com${path.startsWith("/") ? path : `/${path}`}`;

    const r = await fetch(upstream, {
      headers: {
        Accept: "application/json",
        "User-Agent": "zzeolwallet/1.0"
      },
      // 최신값 강제
      cache: "no-store"
    });

    const text = await r.text();

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "no-store");

    // 업비트는 가끔 text로도 응답하는데, 가능하면 JSON으로 파싱해서 전달
    try {
      const json = JSON.parse(text);
      return res.status(r.status).json(json);
    } catch {
      // JSON이 아니면 원문 그대로
      return res.status(r.status).send(text);
    }
  } catch (err) {
    console.error("[upbit proxy error]", err);
    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.status(500).json({ error: "Upbit proxy failed", detail: String(err) });
  }
}
