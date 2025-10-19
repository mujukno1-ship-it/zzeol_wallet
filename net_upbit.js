// net_upbit.js — Upbit 연동 모듈 (분리형)
// 전역 객체 Upbit 제공: initKRWMarkets, getTickerOnce, subscribeTicker, formatKRW 등

const Upbit = (function(){
  // ===== 유틸 =====
  function priceUnit(p){
    if (p >= 2000000) return 1000;
    if (p >= 1000000) return 500;
    if (p >= 500000) return 100;
    if (p >= 100000) return 50;
    if (p >= 10000) return 10;
    if (p >= 1000) return 5;
    if (p >= 100) return 1;
    if (p >= 10) return 0.1;
    if (p >= 1) return 0.01;
    return 0.001;
  }
  function formatKRW(x){
    if (x==null || isNaN(x)) return '—';
    const unit = priceUnit(x);
    const dec = Math.max(0,(unit.toString().split('.')[1]||'').length);
    const fixed = Math.round(x/unit)*unit;
    return fixed.toLocaleString('ko-KR',{minimumFractionDigits:dec,maximumFractionDigits:dec});
  }
  function formatNum(x){
    if (x==null || isNaN(x)) return '—';
    const abs = Math.abs(x);
    if (abs >= 1e12) return (x/1e12).toFixed(2)+'조';
    if (abs >= 1e8)  return (x/1e8).toFixed(2)+'억';
    if (abs >= 1e4)  return (x/1e4).toFixed(2)+'만';
    return x.toLocaleString('ko-KR');
  }

  // ===== HTTP API =====
  async function initKRWMarkets(){
    const res = await fetch('https://api.upbit.com/v1/market/all?isDetails=false',{cache:'no-store'});
    const data = await res.json();
    return data.filter(m=>m.market.startsWith('KRW-'));
  }

  // options: fetch 옵션 (signal 등) 전달 가능
  async function getTickerOnce(market, options={}){
    const url = `https://api.upbit.com/v1/ticker?markets=${market}`;
    const res = await fetch(url,{cache:'no-store', ...options});
    const arr = await res.json();
    return arr[0];
  }

  // ===== 끊김 방지 구독 (HTTP 폴링 + 백오프) =====
  // 사용: const stop = Upbit.subscribeTicker('KRW-BTC', onData)
  function subscribeTicker(market, onData){
    const BACKOFF = [1000, 2000, 5000, 10000, 20000, 30000];
    let cancelled = false, idx = 0;

    async function safeGet(ms=6000){
      const ctrl = new AbortController();
      const t = setTimeout(()=>ctrl.abort(), ms);
      try{
        return await getTickerOnce(market, { signal: ctrl.signal });
      }finally{
        clearTimeout(t);
      }
    }

    function waitOnline(){
      if (navigator.onLine) return Promise.resolve();
      return new Promise(res=>{
        const on=()=>{ window.removeEventListener('online', on); res(); };
        window.addEventListener('online', on, { once:true });
      });
    }

    (async function loop(){
      while(!cancelled){
        if(!navigator.onLine){ await waitOnline(); idx=0; }
        try{
          const t = await safeGet(6000);
          if (cancelled) return;
          if (t) onData && onData(t);
          await new Promise(r=>setTimeout(r, 1000));
          idx = 0;
        }catch(e){
          const d = BACKOFF[Math.min(idx++, BACKOFF.length-1)];
          // console.warn('[Upbit] retry in', d, 'ms', e?.name||e);
          await new Promise(r=>setTimeout(r, d));
        }
      }
    })();

    return ()=>{ cancelled = true; };
  }

  // (옵션) 분봉 캔들
  async function getMinutesCandles(market, unit=1, count=200){
    const url = `https://api.upbit.com/v1/candles/minutes/${unit}?market=${market}&count=${count}`;
    const res = await fetch(url,{cache:'no-store'});
    const data = await res.json();
    return data.reverse();
  }

  return {
    // util
    priceUnit, formatKRW, formatNum,
    // http
    initKRWMarkets, getTickerOnce, getMinutesCandles,
    // resilient subscribe
    subscribeTicker
  };
})();
