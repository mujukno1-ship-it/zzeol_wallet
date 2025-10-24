// 온체인 지표 샘플 안정화: DefiLlama -> JSON 아닌 경우 대비 + 대체 API
export const onRequestGet = async () => {
  try {
    // 1차: stablecoins.llama.fi (원래 엔드포인트)
    const r1 = await fetch("https://stablecoins.llama.fi/summary", {
      headers: { accept: "application/json", "user-agent": "zzeol-wallet" },
      cf: { cacheTtl: 30, cacheEverything: true },
    });
    const j1 = await safeJson(r1);

    // 2차: 대체(요약 TVL) – 실패 시 OK 유지용
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
    return json({ ok: false, error: String(e) }, 200); // 오류여도 200 + ok:false (UI는 표시만)
  }
};

async function safeJson(res) {
  if (!res || !res.ok) return null;
  const ct = (res.headers.get("content-type") || "").toLowerCase();
  // JSON이면 그대로 파싱
  if (ct.includes("application/json")) return res.json();
  // JSON 아니면 text -> JSON 시도
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
