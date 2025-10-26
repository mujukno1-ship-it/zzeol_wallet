(() => {
  const PROXY = 'https://satoshi-proxy.mujukno1.workers.dev';
  const $ = (id) => document.getElementById(id);
  const setText = (id, v) => { const el = $(id); if (el) el.textContent = v; };
  const fmt = {
    pct: (x) => (x==null||isNaN(x))?'--%':`${Number(x).toFixed(2)}%`,
    krw: (x) => (x==null||isNaN(x))?'-':Number(x).toLocaleString('ko-KR'),
    num: (x) => (x==null||isNaN(x))?'-':Number(x).toLocaleString('en-US'),
  };

  async function get(url){
    const r = await fetch(url,{cache:'no-store'});
    if(!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  }

  async function loadKimchi(){
    try{
      const d = await get(`${PROXY}/api/premium?symbol=BTC`);
      if(!d.ok) throw new Error('invalid');
      setText('kimchi-premium', fmt.pct(d.premiumPct));
      setText('upbit-krw', fmt.krw(d.upbitPrice));
      setText('global-krw', fmt.krw(d.globalKrw));
      setText('usd-krw', fmt.num(d.usdkrw));
      setText('status', '');
    }catch(e){
      setText('kimchi-premium','--%');
      setText('status','오류');
    }
  }

  async function loadOnchain(){
    try{
      const d = await get(`${PROXY}/api/onchain?symbol=ETH`);
      if(!d.ok) throw new Error('invalid');
      setText('onchain-tvl', fmt.num(d.tvl));
      setText('onchain-active', d.activeAddress?fmt.num(d.activeAddress):'-');
    }catch(e){
      setText('onchain-tvl','-');
      setText('onchain-active','-');
    }
  }

  document.addEventListener('DOMContentLoaded',()=>{
    loadKimchi(); loadOnchain();
    setInterval(loadKimchi,15000);
    setInterval(loadOnchain,30000);
  });
})();
