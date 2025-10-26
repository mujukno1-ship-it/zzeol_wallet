import { CONFIG } from "../config.js";
import { apiGet } from "../api.js";

// 온체인(TVL)
export async function getOnchain(symbol = CONFIG.ONCHAIN_SYMBOL) {
  return apiGet(`/api/onchain?symbol=${encodeURIComponent(symbol)}`, {
    cacheKey: `onchain:${symbol}`,
  });
}
