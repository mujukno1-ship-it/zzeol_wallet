// api/onchain.js
// 무료 공개 소스 기반 온체인 근사 지표 (Glassnode 대체)
// CoinGecko + Binance + Fear&Greed 통합
export default async function handler(req, res) {
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

  async function j(url, headers = {}) {
    try {
      const r = await fetch(url, { headers, cache: "no-store" });
      if (!r.ok) throw new Error(String(r.status));
      return await r.json();
    } catch (e) {
      return null;
    }
  }

  // 1️⃣ CoinGecko: BTC 200일 평균가 기반 MVRV 근사 계산
  const cg = await j(
    "https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=200"
  );
  if (cg && Array.isArray(cg.prices) && cg.prices.length > 50) {
    const prices = cg.prices.map((p) => Number(p[1])).filter(Number.isFinite);
    const cur = prices.at(-1);
    const ma200 = prices.reduce((a, b) => a + b, 0) / prices.length;
    const ratio = cur / ma200;
    if (ratio) {
      out.mvrv = Number((ratio * 1.5).toFixed(3));
      out.source.push("coingecko:ma200-proxy");
    }
  }

  // 2️⃣ Binance Futures Funding Rate
  const fr = await j("https://fapi.binance.com/fapi/v1/fundingRate?symbol=BTCUSDT&limit=1");
  if (Array.isArray(fr) && fr.length) {
    const v = Number(fr[0].fundingRate);
    if (Number.isFinite(v)) {
      out.fundingRate = v;
      out.source.push("binance:funding");
    }
  }

  // 3️⃣ Binance Open Interest
  const oi = await j("https://fapi.binance.com/fapi/v1/openInterest?symbol=BTCUSDT");
  if (oi && oi.openInterest) {
    const v = Number(oi.openInterest);
    if (Number.isFinite(v)) {
      out.openInterest = v;
      out.source.push("binance:openInterest");
    }
  }

  // 4️⃣ Fear & Greed Index
  const fng = await j("https://api.alternative.me/fng/?limit=1");
  if (fng?.data?.[0]?.value) {
    out.fearGreed = Number(fng.data[0].value);
    out.source.push("altme:feargreed");
  }

  if (!out.source.length) {
    out.mvrv = 1.2;
    out.fundingRate = 0.01;
    out.openInterest = null;
    out.fearGreed = 50;
    out.source.push("fallback");
  }

  res.status(200).json(out);
}
