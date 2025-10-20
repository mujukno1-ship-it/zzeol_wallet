// 변동성 기반 타점 (변동률 반영)
export function calcTradeLevels(price, changeRate = 0) {
  const base = Math.abs(changeRate);
  const adj = base > 0.05 ? 1.5 : base > 0.02 ? 1.2 : 1.0;

  return {
    buy: price * (1 - 0.012 * adj),
    sell: price * (1 + 0.012 * adj),
    stop: price * (1 - 0.025 * adj),
  };
}
