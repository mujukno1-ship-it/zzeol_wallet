// pages/api/onchain.js
// 무료 공개 소스만 사용해서 온체인/파생 근사 지표 제공
// - CoinGecko: BTC 200일 가격 -> MA200 대비 비율 (mvrv proxy)
// - Binance Futures: fundingRate / openInterest
// - Fear&Greed Index: sentiment (참고)
// 반환 스키마는 기존과 동일: mvrv, exchangeNetflow, fundingRate, openInterest, stablecoinNetflow, source, ok

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const out = {
    ts: Date.now(),
    mvrv: null,                  // MA200 비율을 mvrv proxy로 사용
    exchangeNetflow: null,       // 무료 대체 없음 -> null
    btcOnExchangeBalance: null,  // 무료 대체 없음 -> null
    fundingRate: null,           // Binance
    openInterest: null,          // Binance
    stablecoinNetflow: null,     // 무료 대체 없음 -> null
    fearGreed: null,             // 참고치
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

  // 1) CoinGecko: BTC 가격 200일 -> MA200 비율 계산 (mvrv proxy)
  //  - API: /coins/bitcoin/market_chart?vs_currency=usd&days=200
  //  - 가격 배열 [ [ts, price], ... ]
  const cg = await j(
    "https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=200"
  );
  if (cg && Array.isArray(cg.prices) && cg.prices.length > 50) {
    try {
      const prices = cg.prices.map((p) => Number(p[1])).filter(Number.isFinite);
      const cur = prices[prices.length - 1];
      const ma200 = prices.reduce((a, b) => a + b, 0) / prices.length;
      const ratio = cur && ma200 ? cur / ma200 : null; // 1.0이면 중립, <1 저평가, >1 고평가
      // 기존 프론트가 mvrv <1.5 저평가, >3 과열 로직을 쓰므로 스케일을 살짝 보정
      // ex) ratio 0.9 ~ 1.2 -> mvrv 1.1 ~ 1.8 정도로 매핑
      if (ratio) {
        out.mvrv = Number((ratio * 1.5).toFixed(3));
        out.source.push("coingecko:ma200-proxy");
      }
    } catch {}
  }

  // 2) Binance Futures: 최근 펀딩비 (공개 엔드포인트)
  //    https://fapi.binance.com/fapi/v1/fundingRate?symbol=BTCUSDT&limit=1
  const fr = await j(
    "https://fapi.binance.com/fapi/v1/fundingRate?symbol=BTCUSDT&limit=1"
  );
  if (Array.isArray(fr) && fr.length) {
    const v = Number(fr[0].fundingRate);
    if (Number.isFinite(v)) {
      out.fundingRate = v; // 예: 0.0123 => 1.23%
      out.source.push("binance:funding");
    }
  }

  // 3) Binance Futures: 현재 Open Interest (공개 엔드포인트)
  //    https://fapi.binance.com/fapi/v1/openInterest?symbol=BTCUSDT
  const oi = await j("https://fapi.binance.com/fapi/v1/openInterest?symbol=BTCUSDT");
  if (oi && oi.openInterest) {
    const v = Number(oi.openInterest);
    if (Number.isFinite(v)) {
      out.openInterest = v; // 단위: 계약수(USDT 기반)
      out.source.push("binance:openInterest");
    }
  }

  // 4) Fear & Greed Index (보조지표)
  //    https://api.alternative.me/fng/?limit=1
  const fng = await j("https://api.alternative.me/fng/?limit=1");
  if (fng && fng.data && fng.data[0] && fng.data[0].value) {
    out.fearGreed = Number(fng.data[0].value); // 0~100 (낮을수록 공포)
    out.source.push("altme:feargreed");
  }

  // 5) 값이 너무 비어있으면 보수적 fallback (프론트 동작 보장)
  if (!out.source.length) {
    out.mvrv = 1.2;
    out.fundingRate = 0.01;
    out.openInterest = null;
    out.fearGreed = 52;
    out.source.push("fallback");
  }

  res.status(200).json(out);
}
