// api/onchain.js
// 무료 공개 소스 기반 온체인 근사 지표 (CoinGecko + Binance + Fear&Greed)
// CommonJS (module.exports) 버전 — Vercel 정적+Functions에서 확실히 동작

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const out = {
    ts: Date.now(),
    mvrv: null,
    exchangeNetflow: null,
    btcOnExchangeBalance: null,
    fundingRate: null,
    openInterest: null,
    stablecoinNetflow: null,
    fearGreed: null,
    source: [],
    ok: true,
  };

  const j = async (url, headers = {}) => {
    try {
      const r = await fetch(url, { headers, cache: "no-store" });
      if (!r.ok) throw new Error(String(r.status));
      return await r.json();
    } catch (e) {
      return null;
    }
  };

  // 1) CoinGecko: BTC 200일 평균대비 비율 → mvrv proxy
  const cg = await j("https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=200");
  if (cg?.prices?.length > 50) {
    const prices = cg.prices.map(p => Number(p[1])).filter(Number.isFinite);
    const cur = prices.at(-1);
    const ma200 = prices.reduce((a, b) => a + b, 0) / prices.length;
    const ratio = (cur && ma200) ? cur / ma200 : null;
    if (ratio) {
      out.mvrv = Number((ratio * 1.5).toFixed(3)); // 프론트 mvrv 스케일과 맞춤
      out.source.push("coingecko:ma200-proxy");
    }
  }

  // 2) Binance Futures: Funding Rate
  const fr = await j("https://fapi.binance.com/fapi/v1/fundingRate?symbol=BTCUSDT&limit=1");
  if (Array.isArray(fr) && fr.length) {
    const v = Number(fr[0].fundingRate);
    if (Number.isFinite(v)) {
      out.fundingRate = v;
      out.source.push("binance:funding");
    }
  }

  // 3) Binance Futures: Open Interest
  const oi = await j("https://fapi.binance.com/fapi/v1/openInterest?symbol=BTCUSDT");
  if (oi?.openInterest) {
    const v = Number(oi.openInterest);
    if (Number.isFinite(v)) {
      out.openInterest = v;
      out.source.push("binance:openInterest");
    }
  }

  // 4) Fear & Greed Index
  const fng = await j("https://api.alternative.me/fng/?limit=1");
  if (fng?.data?.[0]?.value) {
    out.fearGreed = Number(fng.data[0].value);
    out.source.push("altme:feargreed");
  }

  // Fallback
  if (!out.source.length) {
    out.mvrv = 1.2;
    out.fundingRate = 0.01;
    out.openInterest = null;
    out.fearGreed = 50;
    out.source.push("fallback");
  }

  res.status(200).json(out);
};
