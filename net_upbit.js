(function(){
  const BASE='https://api.upbit.com/v1';
  async function fetchTicker(market){
    const res=await fetch(`${BASE}/ticker?markets=${encodeURIComponent(market)}`);
    const j=await res.json(); const t=j[0];
    return{
      market:t.market,
      trade_price:t.trade_price,
      signed_change_price:t.signed_change_price,
      prev_closing_price:t.prev_closing_price,
      ask_price:t.ask_price,
      bid_price:t.bid_price
    };
  }
  let timer;
  function startAutoUpdate({market='KRW-ETH',onUpdate=()=>{},intervalMs=1000}){
    if(timer)clearInterval(timer);
    fetchTicker(market).then(onUpdate);
    timer=setInterval(async()=>onUpdate(await fetchTicker(market)),intervalMs);
  }
  window.Upbit={fetchTicker,startAutoUpdate};
})();
