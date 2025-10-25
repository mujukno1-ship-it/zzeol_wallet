(() => {
  const PROXY = 'https://satoshi-proxy.mujukno1.workers.dev';

  const $ = (id) => document.getElementById(id);
  const setText = (id, value) => { const el = $(id); if (el) el.textContent = value; };
  const fmt = {
    pct: (x) => (x == null || isNaN(x)) ? '--%' : `${Number(x).toFixed(2)}%`,
    krw: (x) => (x == null || isNaN(x)) ? '-' : Number(x).toLocaleString('ko-KR'),
    num: (x) => (x == null || isNaN(x)) ? '-' : Number(x).toLocaleString('en-US'),
  };

  async function fetchJSON(url) {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  async function loadKimchi() {
    try {
      const d = await fetchJSON(`${PROXY}/api/premium?symbol=BTC`);
      if (!d.ok) throw new Error('invalid payload');
      setText('kimchi-premium', fmt.pct(d.premiumPct));
      setText('upbit-krw', fmt.krw(d.upbitPrice));
      setText('global-krw', fmt.krw(d.globalKrw));
      setText('usd-krw', fmt.num(d.usdkrw));
      setText('status', '');
    } catch (e) {
      console.warn('김프 오류:', e);
      setText('kimchi-premium', '--%');
      setText('status', '오류');
    }
  }

  async function loadOnchain() {
    try {
      const d = await fetchJSON(`${PROXY}/api/onchain?symbol=ETH`);
      if (!d.ok) throw new Error('invalid payload');
      setText('onchain-tvl', fmt.num(d.tvl));
      setText('onchain-active', d.activeAddress ? fmt.num(d.activeAddress) : '-');
    } catch (e) {
      console.warn('온체인 오류:', e);
      setText('onchain-tvl', '-');
      setText('onchain-active', '-');
    }
  }

  function boot() {
    loadKimchi();
    loadOnchain();
    setInterval(loadKimchi, 15000);
    setInterval(loadOnchain, 30000);
  }

  document.addEventListener('DOMContentLoaded', boot);
})();
