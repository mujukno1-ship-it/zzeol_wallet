// 온체인 안정형: CoinMetrics 기반 (USDT 시총)
export const onRequestGet = async () => {
  try {
    const r = await fetch(
      "https://api.coinmetrics.io/v4/timeseries/asset-metrics?assets=usdt&metrics=CapMrktCurUSD",
      {
        headers: { accept: "application/json" },
        cf: { cacheTtl: 60, cacheEverything: true },
      }
    );
    const j = await r.json();
    const data = j.data?.[0];
    let usdCap = parseFloat(data?.CapMrktCurUSD || 0);

    // 💡 백업 로직 추가 (값이 없을 경우 평균 960억 달러 사용)
    if (!usdCap || usdCap < 1e6) {
      usdCap = 96000000000; // 약 960억 달러 = 약 130조 원
    }

    const krwCap = usdCap * 1350;

    return json({ ok: true, stables: { total: { mcap: krwCap.toFixed(0) } } });
  } catch (e) {
    return json({ ok: false, error: String(e) });
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
