// 아주 단순한 예시: 현재가 = 업비트 가격, 매수/매도/손절은 비율 기반
window.calcIndicators = function(premium){
  const now = premium?.upbitPrice ?? null;
  if(!now) return { now:null, buy:null, sell:null, stop:null };

  const buy  = now * 0.995; // -0.5%
  const sell = now * 1.02;  // +2%
  const stop = now * 0.98;  // -2%

  return {
    now: Math.round(now),
    buy: Math.round(buy),
    sell: Math.round(sell),
    stop: Math.round(stop),
  };
};
