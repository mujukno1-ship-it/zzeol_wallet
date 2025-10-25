export default async function handler(req,res){
  try{
    res.status(200).json({ ok:true, source:'onchain:stub', ts:Date.now() });
  }catch(e){
    // ---------- 김치 프리미엄: 안전모드 (항상 숫자 응답) ----------
if (url.pathname === "/api/premium") {
  // 기본값(최악의 상황에도 숫자 보장)
  let upbit_krw = 58600000;   // KRW-BTC
  let binance_usd = 43000;    // BTCUSDT
  let usdkrw = 1380;          // USD→KRW
  const note = [];

  const toJSON = (txt) => { try { return JSON.parse(txt); } catch { return null; } };
  const getText = async (u) => {
    const r = await fetch(u, {
      headers: {
        "Accept": "application/json,text/plain,*/*",
        "User-Agent": "Mozilla/5.0 (compatible; SatoshiProxy/1.0)"
      },
      cf: { cacheTtl: 0, cacheEverything: false },
    });
    return await r.text();
  };

  // 1) 업비트 → 실패시 crix → 그래도 실패면 기본값 유지
  try {
    const t = await getText("https://api.upbit.com/v1/ticker?markets=KRW-BTC");
    const j = toJSON(t);
    const v = Number(j?.[0]?.trade_price);
    if (v) upbit_krw = v; else throw new Error("upbit json empty");
  } catch {
    note.push("upbit fail");
    try {
      const t2 = await getText("https://crix-api-cdn.upbit.com/v1/crix/candles/minutes/1?code=CRIX.UPBIT.KRW-BTC&count=1");
      const j2 = toJSON(t2);
      const n = Array.isArray(j2) ? j2[0] : null;
      const v2 = Number(n?.tradePrice ?? n?.closePrice ?? n?.openingPrice);
      if (v2) upbit_krw = v2; else throw new Error("crix empty");
    } catch { note.push("crix fail; use default"); }
  }

  // 2) 바이낸스
  try {
    const t = await getText("https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT");
    const j = toJSON(t);
    const v = Number(j?.price);
    if (v) binance_usd = v; else throw new Error("binance json empty");
  } catch { note.push("binance fail; use default"); }

  // 3) 환율 (1차 → 2차 → 기본값)
  try {
    const t = await getText("https://api.exchangerate.host/latest?base=USD&symbols=KRW");
    const j = toJSON(t);
    const v = Number(j?.rates?.KRW);
    if (v) usdkrw = v; else throw new Error("exchangerate empty");
  } catch {
    note.push("fx1 fail");
    try {
      const t2 = await getText("https://api.frankfurter.app/latest?from=USD&to=KRW");
      const j2 = toJSON(t2);
      const v2 = Number(j2?.rates?.KRW);
      if (v2) usdkrw = v2; else throw new Error("frankfurter empty");
    } catch { note.push("fx2 fail; use default"); }
  }

  const global_krw = binance_usd * usdkrw;
  const premium_pct = ((upbit_krw / global_krw) - 1) * 100;

  return json({
    ok: true,
    upbit_krw,
    binance_usd,
    usdkrw,
    global_krw,
    premium_pct,
    ts: Date.now(),
    note
  }, 200, CORS);
}

    return json({ ok: false, error: "Not Found" }, 404, CORS);
}

    res.status(500).json({ ok:false, error:e?.message || 'onchain_error' });
  }
}
