// 온체인 지표 샘플 안정화: DefiLlama -> JSON 아님 대비 + 대체 API
export const onRequestGet = async () => {
  try {
    const r1 = await fetch("https://stablecoins.llama.fi/summary", {
      headers: { accept: "application/json", "user-agent": "zzeol-wallet" },
      cf: { cacheTtl: 30, cacheEverything: true },
    });
    const j1 = await safeJson(r1);

    let fallback = null;
    if (!j1) {
      const r2 = await fetch("https://api.llama.fi/overview/stablecoins?stablecoin=USD", {
        headers: { accept: "application/json", "user-agent": "zzeol-wallet" },
        cf: { cacheTtl: 30, cacheEverything: true },
      });
      fallback = await safeJson(r2);
    }

    const out = j1 || fallback;
    if (!out) throw new Error("onchain: no json");

    return json({ ok: true, stables: out });
  } catch (e) {
    // 실패해도 200 + ok:false 로 내려 UI가 전체를 '오류'로 두지 않게
    return json({ ok: false, error: String(e) }, 200);
  }
};

async function safeJson(res) {
  if (!res || !res.ok) return null;
  const ct = (res.headers.get("content-type") || "").toLowerCase();
  if (ct.includes("application/json")) return res.json();
  const t = await res.text();
  try { return JSON.parse(t); } catch { return null; }
}
const json = (obj, code = 200) =>
  new Response(JSON.stringify(obj), {
    status: code,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
      "cache-control": "max-age=15, s-maxage=15",
    },
  });
