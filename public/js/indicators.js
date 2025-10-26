// ==== indicators.js (시작)
const IND = (() => {
  function formatKRW(n){ return Number(n||0).toLocaleString('ko-KR') + ' ₩'; }
  function formatUSD(n){ return Number(n||0).toLocaleString('en-US',{maximumFractionDigits:0}) + ' USD'; }
  function pct(v){ return (v>0?'+':'') + (Number(v)||0).toFixed(2) + '%'; }

  // 시그널: 현재가 기준으로 ±1.6% 매수/매도, -3.5% 손절(예시)
  function signalFromUpbitKRW(upbitKRW){
    const price = upbitKRW||0;
    const buy  = price * 0.984;   // -1.6%
    const sell = price * 1.016;   // +1.6%
    const stop = price * 0.965;   // -3.5%
    const risk = 1;               // 데모 고정
    return {
      priceKRW: formatKRW(price),
      buyKRW:   formatKRW(buy),
      sellKRW:  formatKRW(sell),
      stopKRW:  formatKRW(stop),
      risk: `${risk} / 5`,
    };
  }

  return { pct, formatKRW, formatUSD, signalFromUpbitKRW };
})();
// ==== indicators.js (끝)
