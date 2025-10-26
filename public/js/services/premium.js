import { CONFIG } from "../config.js";
import { apiGet } from "../api.js";

// 김프(업비트/글로벌/USD-KRW 등)
export async function getPremium(symbol = CONFIG.PREMIUM_SYMBOL) {
  return apiGet(`/api/premium?symbol=${encodeURIComponent(symbol)}`, {
    cacheKey: `premium:${symbol}`,
  });
}
