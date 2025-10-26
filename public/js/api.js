/* ==== START: public/js/api.js ==== */
(function () {
  const BASE = window.APP_CONFIG.PROXY_BASE;

  async function getJSON(url) {
    const res = await fetch(url, { headers: { "cache-control": "no-cache" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  async function getPremium(symbol) {
    symbol = symbol || window.APP_CONFIG.DEFAULT_SYMBOL;
    return getJSON(`${BASE}/api/premium?symbol=${encodeURIComponent(symbol)}`);
  }

  async function getOnchain(symbol) {
    symbol = symbol || window.APP_CONFIG.DEFAULT_CHAIN_SYMBOL;
    return getJSON(`${BASE}/api/onchain?symbol=${encodeURIComponent(symbol)}`);
  }

  window.API = { getPremium, getOnchain };
})();
 /* ==== END: public/js/api.js ==== */
