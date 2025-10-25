(() => {
  const PROXY = 'https://satoshi-proxy.mujukno1.workers.dev';

  const $ = (id) => document.getElementById(id);
  const setText = (id, v) => { const n = $(id); if (n) n.textContent = v; };
  const fmt = {
    pct: (x) => (x==null || isNaN(x)) ? '--%' : `${Number(x).toFixed(2)}%`,
    krw: (x) => (x==null || isNaN(x)) ? '-'   : Number(x).toLocaleString('ko-KR'),
    num: (x) => (x==null || isNaN(x)) ? '-'   : Number(x).toLocaleString('en-US'),
  };

  async function j(url){
    const r = await fetch(url, { cache:'no-store' });
    if(!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  }

  async function loadKimchi(){
    try{
      const d = await j(`${PROXY}/api/premium?symbol=BTC`);
      if(!d || d.ok!==true) throw new Error('invalid payload');

      setText('kimchi-premium', fmt.pct(d.premiumPct));
      setText('upbit-krw', fmt.krw(d.upbitPrice));
      setText('global-krw', fmt.krw(d.globalKrw));
      setText('usd-krw', fmt.num(d.usdkrw));
      setText('status', '');
      console.log('✅ premium OK', d);
    }catch(e){
      console.warn('premium error:', e);
      setText('kimchi-premium','--%');
      setText('upbit-krw','-'); setText('global-krw','-'); setText('usd-krw','-');
      setText('status','오류');
    }
  }

  async function loadOnchain(){
    try{
      const d = await j(`${PROXY}/api/onchain?symbol=ETH`);
      if(!d || d.ok!==true) throw new Error('invalid payload');

      setText('onchain-tvl', fmt.num(d.tvl));
      setText('onchain-active', d.activeAddress ? fmt.num(d.activeAddress) : '-');
      console.log('✅ onchain OK', d);
    }catch(e){
      console.warn('onchain error:', e);
      setText('onchain-tvl','-'); setText('onchain-active','-');
    }
  }

  function boot(){
    loadKimchi(); loadOnchain();
    setInterval(loadKimchi, 15000);
    setInterval(loadOnchain, 30000);
  }

  document.addEventListener('DOMContentLoaded', boot);
})();
