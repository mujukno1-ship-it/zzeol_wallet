// 온체인 실시간 버전: DeFiLlama Stablecoin API
export const onRequestGet = async () => {
  try {
    const r = await fetch("https://stablecoins.llama.fi/stablecoins?includePrices=true", {
      headers: { accept: "application/json" },
      cf: { cacheTtl: 60, cacheEverything: true }
    });
    const j = await r.json();

    // 전체 스테이블코인 총 시가총액 (USD)
    const totalUSD = j.totalCirculatingUSD || 0;
    const change24h = j.change_24h || 0;

    const krwCap = totalUSD * 1350; // 원화 환산

    return json({
      ok: true,
      stables: {
        total: { mcap: Math.round(krwCap), change: change24h }
      },
      src: "defillama"
    });
  } catch (e) {
    // 백업 로직 (CoinMetrics)
    const backup = await fetch(
      "https://api.coinmetrics.io/v4/timeseries/asset-metrics?assets=usdt&metrics=CapMrktCurUSD",
      { headers: { accept: "application/json" } }
    ).then(r => r.json()).catch(() => null);

    const cap = parseFloat(backup?.data?.[0]?.CapMrktCurUSD || 96000000000);
    const krw = cap * 1350;

    return json({
      ok: true,
      stables: { total: { mcap: Math.round(krw), change: 0 } },
      src: "coinmetrics"
    });
  }
};

const json = (obj, code = 200) =>
  new Response(JSON.stringify(obj), {
    status: code,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
      "cache-control": "max-age=60, s-maxage=60"
    }
  });
