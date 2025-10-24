// FullSet ∞ On-Chain Flow v1.0
// 스테이블코인 자금 유입/유출 감지 (USDT·USDC·DAI)

export const onRequestGet = async () => {
  try {
    const res = await fetch("https://stablecoins.llama.fi/stablecoins?includePrices=true", {
      headers: { accept: "application/json" },
      cf: { cacheTtl: 60, cacheEverything: true },
    });
    const j = await res.json();

    const totalUSD = j.totalCirculatingUSD || 0;
    const change24h = j.change_24h || 0;
    const coins = j.peggedAssets?.filter(x => ["Tether", "USDC", "Dai"].includes(x.name)) || [];

    const parsed = coins.map(c => ({
      symbol: c.symbol,
      name: c.name,
      mcapUSD: c.circulating?.[0]?.totalCirculatingUSD || 0,
      change24h: c.change_24h || 0
    }));

    const krw = totalUSD * 1350;
    const outflowAll = parsed.every(c => c.change24h < 0);
    const risk = outflowAll ? "⚠️ 자금 이탈 경고" : (change24h < 0 ? "주의" : "정상");

    return json({
      ok: true,
      total: { mcapKRW: Math.round(krw), change24h, risk },
      coins: parsed,
      src: "defillama"
    });
  } catch (e) {
    // 백업: CoinMetrics USDT 시총
    const backup = await fetch(
      "https://api.coinmetrics.io/v4/timeseries/asset-metrics?assets=usdt&metrics=CapMrktCurUSD",
      { headers: { accept: "application/json" } }
    ).then(r => r.json()).catch(() => null);

    const cap = parseFloat(backup?.data?.[0]?.CapMrktCurUSD || 96000000000);
    const krw = cap * 1350;

    return json({
      ok: true,
      total: { mcapKRW: Math.round(krw), change24h: 0, risk: "백업모드" },
      coins: [{symbol:"USDT", mcapUSD:cap, change24h:0}],
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
