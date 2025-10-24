(function(){
  const BASE='https://api.upbit.com/v1';
  async function fetchTicker(market){
    const res=await fetch(`${BASE}/ticker?markets=${encodeURIComponent(market)}`,{headers:{accept:'application/json'}});
    if(!res.ok) throw new Error(`upbit http ${res.status}`);
    const j=await res.json(); const t=j[0];
    return{
      market:t.market,
      trade_price:t.trade_price,
      signed_change_price:t.signed_change_price,
      prev_closing_price:t.prev_closing_price,
      ask_price:t.ask_price,
      bid_price:t.bid_price,
      timestamp:t.timestamp
    };
  }
  let timer=null;
  function startAutoUpdate({market='KRW-ETH',onUpdate=()=>{},intervalMs=1000}){
    if(timer) clearInterval(timer);
    fetchTicker(market).then(onUpdate).catch(console.error);
    timer=setInterval(async()=>{ try{ onUpdate(await fetchTicker(market)); } catch(e){ console.error(e); } }, Math.max(500,intervalMs|0));
  }
  window.Upbit={ fetchTicker, startAutoUpdate };
})();
