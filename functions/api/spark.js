// ⚡ Spark detector — keep 24h (Cloudflare Pages Functions)
//
// - 최근 3분 상승률(deltaPct) + 거래량 급증 배율(volRatio)로 스파크 감지
// - 감지 후 캐시/히스토리 모두 24시간 보존(사용자 체감: 안 사라짐)

const g = globalThis;
g._sparkCache  ||= new Map();   // market -> {market,name,price,deltaPct,volRatio,ts}
g._sparkHistory||= [];          // [{market,name,price,deltaPct,volRatio,at}]

export const onRequestGet = async () => {
  try {
    // 1) KRW 마켓 목록
    const marketsRes = await fetch("https://api.upbit.com/v1/market/all", {
      headers: { accept: "application/json" },
      cf: { cacheTtl: 60, cacheEverything: true },
    });
    if (!marketsRes.ok) throw new Error("market/all " + marketsRes.status);
    const marketsAll = await marketsRes.json();
    const krw = marketsAll.filter(m => m.market?.startsWith("KRW-")).map(m => m.market);

    // 2) 24h 거래대금 상위만 선별 (부하/속도 개선)
    const tickersRes = await fetch(
      "https://api.upbit.com/v1/ticker?markets=" + encodeURIComponent(krw.join(",")),
      { headers: { accept: "application/json" }, cf: { cacheTtl: 5, cacheEverything: true } }
    );
    if (!tickersRes.ok) throw new Error("ticker " + tickersRes.status);
    const tickers = await tickersRes.json();
    const TOP_N = 50;
    const top = tickers
      .sort((a, b) => (b.acc_trade_price_24h || 0) - (a.acc_trade_price_24h || 0))
      .slice(0, TOP_N)
      .map(t => t.market);

    // 3) 분봉 가져와 스파크 계산 (동시요청 제한)
    const CONC = 15;
    const out = [];
    for (let i = 0; i < top.length; i += CONC) {
      const batch = top.slice(i, i + CONC).map(m => fetchMinuteSpark(m));
      // eslint-disable-next-line no-await-in-loop
      out.push(...(await Promise.all(batch)));
    }

    // 4) 임계치 적용 → 캐시/히스토리 적재
    const TH_PCT = 2.0;  // 최근 3분 +2% 이상
    const TH_VOL = 3.0;  // 최근 3분 거래량이 직전 평균 3배 이상
    const now = Date.now();

    out.filter(Boolean).forEach(x => {
      if (x.deltaPct >= TH_PCT && x.volRatio >= TH_VOL) {
        // 리스트(현재)
        g._sparkCache.set(x.market, { ...x, ts: now });

        // 히스토리(중복 과도 방지: 1분 내 동일마켓 중복 무시)
        const dup = [...(g._sparkHistory || [])].reverse()
          .find(h => h.market === x.market && (now - h.at) < 60_000);
        if (!dup) g._sparkHistory.push({ ...x, at: now });
      }
    });

    // 5) 보존 정책: 24시간 유지
    const KEEP = 24 * 60 * 60 * 1000;
    for (const [k, v] of g._sparkCache) {
      if (now - v.ts > KEEP) g._sparkCache.delete(k);
    }
    while (g._sparkHistory.length && (now - g._sparkHistory[0].at > KEEP)) {
      g._sparkHistory.shift();
    }

    // 6) 응답 정렬/제한
    const list = Array.from(g._sparkCache.values())
      .sort((a, b) => (b.deltaPct * b.volRatio) - (a.deltaPct * a.volRatio))
      .slice(0, 100);

    const history = g._sparkHistory.slice(-500).sort((a, b) => b.at - a.at);

    return json({ ok: true, list, history, params: { TH_PCT, TH_VOL, keepHours: 24 } }, 200, 5);
  } catch (e) {
    return json({ ok: false, error: String(e) }, 500);
  }
};

// --- helpers ---
async function fetchMinuteSpark(market) {
  try {
    const r = await fetch(
      `https://api.upbit.com/v1/candles/minutes/1?market=${market}&count=10`,
      { headers: { accept: "application/json" }, cf: { cacheTtl: 2, cacheEverything: true } }
    );
    if (!r.ok) return null;
    const c = await r.json();
    if (!Array.isArray(c) || c.length < 5) return null;

    const pNow = c[0].trade_price;
    const idx3 = Math.min(3, c.length - 1);
    const p3   = c[idx3].trade_price;
    const deltaPct = ((pNow - p3) / p3) * 100;

    const vRecent = sumVol(c.slice(0, 3));    // 최근 3분 합
    const vBaseAvg = avgVol(c.slice(3));      // 그 이전 분들의 평균
    const volRatio = vBaseAvg > 0 ? vRecent / vBaseAvg : 0;

    return { market, name: market.replace("KRW-", ""), price: pNow, deltaPct, volRatio };
  } catch {
    return null;
  }
}
const sumVol = a => a.reduce((s, x) => s + Number(x.candle_acc_trade_volume || 0), 0);
const avgVol = a => a.length ? sumVol(a) / a.length : 0;

const json = (obj, code = 200, ttl = 0) =>
  new Response(JSON.stringify(obj), {
    status: code,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
      ...(ttl ? { "cache-control": `max-age=${ttl}, s-maxage=${ttl}` } : {})
    }
  });
