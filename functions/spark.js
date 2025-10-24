// ⚡ 스파크(단기 급상승) 탐지: 최근 3분 상승률 + 거래량 급증 배율
export const onRequestGet = async () => {
  try{
    const marketsRes = await fetch("https://api.upbit.com/v1/market/all");
    const marketsAll = await marketsRes.json();
    const krw = marketsAll.filter(m=>m.market.startsWith("KRW-")).map(m=>m.market);

    const tickersRes = await fetch("https://api.upbit.com/v1/ticker?markets="+encodeURIComponent(krw.join(",")));
    const tickers = await tickersRes.json();
    const TOP_N = 50;
    const top = tickers.sort((a,b)=>(b.acc_trade_price_24h||0)-(a.acc_trade_price_24h||0)).slice(0,TOP_N).map(t=>t.market);

    const CONCURRENCY = 15;
    const out=[];
    for(let i=0;i<top.length;i+=CONCURRENCY){
      const batch = top.slice(i,i+CONCURRENCY).map(m=>fetchMinuteSpark(m));
      // eslint-disable-next-line no-await-in-loop
      out.push(...(await Promise.all(batch)));
    }

    const THRESH_PCT = 2.0, THRESH_VOL = 3.0;
    const list = out.filter(Boolean)
      .filter(x=>x.deltaPct>=THRESH_PCT && x.volRatio>=THRESH_VOL)
      .sort((a,b)=> (b.deltaPct*b.volRatio)-(a.deltaPct*a.volRatio))
      .slice(0,30);

    return json({ ok:true, list, params:{THRESH_PCT,THRESH_VOL,TOP_N} }, 200, 5);
  }catch(e){ return json({ ok:false, error:String(e) }, 500); }
};

async function fetchMinuteSpark(market){
  try{
    const r = await fetch(`https://api.upbit.com/v1/candles/minutes/1?market=${market}&count=10`, {headers:{accept:"application/json"}, cf:{cacheTtl:2, cacheEverything:true}});
    if(!r.ok) return null;
    const c = await r.json(); if(!Array.isArray(c)||c.length<5) return null;
    const pNow=c[0].trade_price, p3=c[Math.min(3,c.length-1)].trade_price;
    const deltaPct=((pNow-p3)/p3)*100;
    const vRecent=sumVol(c.slice(0,3)), vBaseAvg=avgVol(c.slice(3));
    const volRatio = vBaseAvg>0 ? vRecent/vBaseAvg : 0;
    return { market, name:market.replace("KRW-",""), price:pNow, deltaPct, volRatio };
  }catch{return null;}
}
const sumVol=a=>a.reduce((s,x)=>s+Number(x.candle_acc_trade_volume||0),0);
const avgVol=a=>a.length?sumVol(a)/a.length:0;
const json=(obj,code=200,ttl=0)=>new Response(JSON.stringify(obj),{status:code,headers:{"content-type":"application/json; charset=utf-8","access-control-allow-origin":"*",...(ttl?{"cache-control":`max-age=${ttl}, s-maxage=${ttl}`}:{})}});
