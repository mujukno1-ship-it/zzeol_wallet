// /strategies/levels.volatility.js
export function calcTradeLevels(price, changeRate){
  const base = Math.abs(changeRate || 0);          // 예: 0.032 = 3.2%
  const adj  = base > 0.05 ? 1.5 : (base > 0.02 ? 1.2 : 1.0);

  const buy  = price * (1 - 0.012 * adj);          // 변동성 높을수록 더 아래서 대기
  const sell = price * (1 + 0.012 * adj);          // 변동성 높을수록 더 위에서 익절
  const stop = price * (1 - 0.025 * adj);          // 변동성 높을수록 손절폭 확장

  return {
    buy:  Math.max(0, Math.floor(buy  * 100) / 100),
    sell: Math.floor(sell * 100) / 100,
    stop: Math.max(0, Math.floor(stop * 100) / 100),
  };
}
