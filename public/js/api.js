// ==== api.js (시작)
const API = (() => {
  const U = window.APP_CFG;

  async function json(url) {
    const r = await fetch(url, { cache: 'no-store' });
    if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
    return r.json();
  }

  // 김치 프리미엄 (프록시 /api/premium?symbol=BTC)
  async function getPremium(symbol) {
    const q = encodeURIComponent(symbol);
    return json(`${U.PROXY_URL}/api/premium?symbol=${q}`);
  }

  // 온체인 TVL (프록시 /api/onchain?symbol=ETH)
  async function getOnchain(symbol) {
    const q = encodeURIComponent(symbol);
    return json(`${U.PROXY_URL}/api/onchain?symbol=${q}`);
  }

  return { getPremium, getOnchain };
})();
// ==== api.js (끝)
