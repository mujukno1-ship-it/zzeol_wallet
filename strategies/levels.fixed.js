// 고정형 기본타점
export function calcTradeLevels(price) {
  return {
    buy: price * 0.988,
    sell: price * 1.012,
    stop: price * 0.975,
  };
}
