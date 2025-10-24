export const onRequestGet = async () => {
  try {
    const data = await fetch("https://stablecoins.llama.fi/summary").then(r => r.json());
    return new Response(JSON.stringify({ ok: true, data }), {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "access-control-allow-origin": "*"
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "access-control-allow-origin": "*"
      }
    });
  }
};
