// 온체인 안정형: CoinMetrics 기반 (USDT 시총) + 빈값 백업
export const onRequestGet = async () => {
  try {
    const r = await fetch(
      "https://api.coinmetrics.io/v4/timeseries/asset-metrics?assets=usdt&metrics=CapMrktCurUSD",
      { headers: { accept: "application/json" }, cf: { cacheTtl: 60, cacheEverything: true } }
    );
    const j = await r.json();
    const data = j.data?.[0];
    let usdCap = parseFloat(data?.CapMrktCurUSD || 0);

    // 값이 없을 때 평균치 백업 (약 960억 달러 → 130조원)
    if (!usdCap || usdCap < 1e6) usdCap = 96000000000;

    const krwCap = usdCap * 1350;
    return json({ ok: true, stables: { total: { mcap: Math.round(krwCap) } } });
  } catch (e) {
    return json({ ok:false, error:String(e) }, 200);
  }
};

const json = (obj, code = 200) =>
  new Response(JSON.stringify(obj), {
    status: code,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
      "cache-control": "max-age=30, s-maxage=30",
    },
  });
