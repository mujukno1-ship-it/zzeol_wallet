// /strategies/levels.fixed.js
export function calcTradeLevels(price, changeRate){
  return {
    buy:  Math.max(0, Math.floor(price * 0.988 * 100) / 100),
    sell: Math.floor(price * 1.012 * 100) / 100,
    stop: Math.max(0, Math.floor(price * 0.975 * 100) / 100),
  };
}
