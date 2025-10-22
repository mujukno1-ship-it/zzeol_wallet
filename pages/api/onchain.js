// pages/api/onchain.js
// 역할: BTC 온체인/파생 데이터 취합 -> 프론트가 쉽게 쓰도록 표준화
// 사용: 환경변수(있으면 실데이터, 없으면 안전한 더미값)
//   - GLASSNODE_KEY (선택) : https://api.glassnode.com
//   - COINGLASS_KEY  (선택) : https://open-api.coinglass.com
//   - COINMETRICS_KEY(선택) : https://community-api.coinmetrics.io  (무료 티어 있음)

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  const GN = process.env.GLASSNODE_KEY || "";
  const CG = process.env.COINGLASS_KEY || "";
  const CM = process.env.COINMETRICS_KEY || "";

  // 표준 출력 스키마
  const out = {
    ts: Date.now(),
    // 온체인(현물)
    mvrv: null,                 // 저평가~고평가 (낮을수록 매수 유리)
    exchangeNetflow: null,      // 거래소로의 BTC 순유입(+) / 순유출(-)
    btcOnExchangeBalance: null, // 거래소 보유 BTC
    // 파생(선물/옵션)
    fundingRate: null,          // 펀딩비 (+과열/-역추세)
    openInterest: null,         // OI 증가시 변동성 확대 가능
    whaleRatio: null,           // 고래 입출금 비율
    // 스테이블
    stablecoinNetflow: null,    // 거래소 스테이블 유입(+)
    // 상태
    source: [],
    ok: true,
  };

  async function safeFetchJson(url, headers={}) {
    try {
      const r = await fetch(url, { headers, cache: "no-store" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.json();
    } catch (e) {
      return null;
    }
  }

  // ---- 1) Glassnode: MVRV Z-Score, Exchange Net Transfer Volume, Exchange Balance
  if (GN) {
    // MVRV Z-Score (일 단위)
    // 문서: https://docs.glassnode.com
    const mvrv = await safeFetchJson(`https://api.glassnode.com/v1/metrics/market/mvrv_z_score?a=BTC&i=24h&api_key=${GN}`);
    if (Array.isArray(mvrv) && mvrv.length) {
      out.mvrv = Number(mvrv[mvrv.length - 1]?.v ?? null);
      out.source.push("glassnode:mvrv");
    }

    // 거래소 순유입/유출 (net transfer volume to exchanges)
    const netflow = await safeFetchJson(`https://api.glassnode.com/v1/metrics/transactions/transfers_volume_to_exchanges?a=BTC&i=1h&api_key=${GN}`);
    const netflowOut = await safeFetchJson(`https://api.glassnode.com/v1/metrics/transactions/transfers_volume_from_exchanges?a=BTC&i=1h&api_key=${GN}`);
    if (Array.isArray(netflow) && Array.isArray(netflowOut) && netflow.length && netflowOut.length) {
      const lastIn = Number(netflow[netflow.length - 1]?.v ?? 0);
      const lastOut = Number(netflowOut[netflowOut.length - 1]?.v ?? 0);
      out.exchangeNetflow = lastIn - lastOut; // +면 순유입(매도압력), -면 순유출(보관/매집)
      out.source.push("glassnode:netflow");
    }

    // 거래소 보유 BTC 잔고 (balance on exchanges)
    const exBal = await safeFetchJson(`https://api.glassnode.com/v1/metrics/supply/exchange_balance?a=BTC&i=24h&api_key=${GN}`);
    if (Array.isArray(exBal) && exBal.length) {
      out.btcOnExchangeBalance = Number(exBal[exBal.length - 1]?.v ?? null);
      out.source.push("glassnode:balance");
    }
  }

  // ---- 2) Coinglass: Funding Rate / Open Interest / Whale Ratio (API Key 필요)
  if (CG) {
    const headers = { "coinglassSecret": CG };
    // Funding Rate (BTC 합성 평균)
    const fr = await safeFetchJson("https://open-api.coinglass.com/api/pro/v1/futures/fundingRate?symbol=BTC", headers);
    if (fr?.data && Array.isArray(fr.data) && fr.data.length) {
      // 여러 거래소 평균
      const arr = fr.data.map(x => Number(x.fundingRate)).filter(Number.isFinite);
      if (arr.length) {
        out.fundingRate = arr.reduce((a,b)=>a+b,0)/arr.length;
        out.source.push("coinglass:funding");
      }
    }
    // Open Interest
    const oi = await safeFetchJson("https://open-api.coinglass.com/api/pro/v1/futures/openInterest?symbol=BTC", headers);
    if (oi?.data && Array.isArray(oi.data) && oi.data.length) {
      const arr = oi.data.map(x => Number(x.openInterest)).filter(Number.isFinite);
      if (arr.length) {
        out.openInterest = arr.reduce((a,b)=>a+b,0)/arr.length;
        out.source.push("coinglass:oi");
      }
    }
    // Whale Ratio (거래소 상위주소 비중 유사 지표가 없으면 null)
    // Coinglass에 직접 지표가 없으면 null 유지
  }

  // ---- 3) CoinMetrics or 기타(없으면 생략)
  if (CM) {
    // 예: 스테이블(USDT) 거래소 순유입 근사치 (엔드포인트마다 정의 상이)
    // 여기선 키만 있으면 샘플로 넘어감. 실제 연동 시 엔드포인트 교체.
  }

  // ---- Fallback: 키가 하나도 없는 경우 안전한 더미값 제공 (UI/엔진 동작 보장)
  const noKey = !out.source.length;
  if (noKey) {
    // 보수적 안전 기본값(시장 중립~약강세 가정)
    out.mvrv = 1.2;                 // 저평가~중립
    out.exchangeNetflow = -1200;    // 순유출(매집 성향)
    out.btcOnExchangeBalance = null;
    out.fundingRate = 0.012;        // 과열 아님
    out.openInterest = null;
    out.whaleRatio = 0.42;
    out.stablecoinNetflow = 120_000_000; // 스테이블 유입
    out.source.push("fallback");
  }

  res.status(200).json(out);
}
