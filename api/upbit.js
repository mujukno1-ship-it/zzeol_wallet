export default async function handler(req, res) {
  try {
    const { path } = req.query;
    if (!path) {
      return res.status(400).json({ error: "Missing path parameter" });
    }

    const url = `https://api.upbit.com${path.startsWith("/") ? path : `/${path}`}`;

    const response = await fetch(url, {
      headers: { accept: "application/json" },
      next: { revalidate: 0 },
    });

    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({ error: text });
    }

    const data = await response.json();
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET");
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json(data);
  } catch (error) {
    console.error("Upbit API Error:", error);
    return res.status(500).json({ error: error.message || "Server Error" });
  }
}
