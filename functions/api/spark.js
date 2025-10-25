// functions/api/spark.js
const UPBIT = 'https://api.upbit.com/v1';
const HEADERS = { 'content-type':'application/json; charset=utf-8', 'cache-control':'no-store' };
const ok = (d,s=200)=>new Response(JSON.stringify(d),{status:s,headers:HEADERS});
const sleep = (ms)=>new Promise(r=>setTimeout(r,ms));

async function j(url){ const r=await fetch(url,{cf:{cacheTtl:0}}); if(!r.ok) throw new Error(r.statusText); return r.json(); }

function detectSpark(c,minRise=2.0,minVol=3.0){
  if(!Array.isArray(c)||c.length<10) return null;
  const pNow=c[0].trade_price, p3=c[3].trade_price;
  const rise=((pNow-p3)/p3)*100;
  const v3=c.slice(0,3).reduce((a,x)=>a+(x.candle_acc_trade_volume||0),0);
  const v10=c.slice(0,10).reduce((a,x)=>a+(x.candle_acc_trade_volume||0),0)/10;
  const ratio=v10>0? v3/v10 : 0;
  if(rise>=minRise && ratio>=minVol) return {rise,ratio,price:pNow};
  return null;
}

export async function onRequest({ request }){
  try{
    const u=new URL(request.url);
    const minRise=Number(u.searchParams.get('minRise')||2.0);
    const minVol =Number(u.searchParams.get('minVolRatio')||3.0);
    const limit  =Number(u.searchParams.get('limit')||60);

    const all=await j(`${UPBIT}/market/all?isDetails=false`);
    const krw=all.filter(m=>m.market?.startsWith('KRW-'));

    // 24h 거래금액 상위 우선
    let meta=[];
    for(let i=0;i<krw.length;i+=100){
      const part=krw.slice(i,i+100).map(m=>m.market).join(',');
      const t=await j(`${UPBIT}/ticker?markets=${encodeURIComponent(part)}`);
      meta.push(...t); await sleep(80);
    }
    meta.sort((a,b)=>(b.acc_trade_price_24h||0)-(a.acc_trade_price_24h||0));
    const targets=meta.slice(0,Math.min(limit,meta.length));

    // 1분봉 10개 기준 스파크 탐지(동시 8개)
    const out=[];
    for(let i=0;i<targets.length;i+=8){
      const chunk=targets.slice(i,i+8);
      const res=await Promise.allSettled(chunk.map(async t=>{
        try{
          const c=await j(`${UPBIT}/candles/minutes/1?market=${t.market}&count=10`);
          const sp=detectSpark(c,minRise,minVol);
          if(!sp) return null;
          return { market:t.market, symbol:t.market.replace('KRW-',''),
                   price:Math.round(sp.price), rise3m:+sp.rise.toFixed(2),
                   volRatio:+sp.ratio.toFixed(2), ts:c[0]?.timestamp||Date.now() };
        }catch{ return null; }
      }));
      res.forEach(r=>{ if(r.status==='fulfilled' && r.value) out.push(r.value); });
      await sleep(120);
    }
    out.sort((a,b)=>(b.rise3m-a.rise3m)||(b.volRatio-a.volRatio));

    return ok({ ok:true, count:out.length, minRise, minVolRatio:minVol, items:out, ts:Date.now() });
  }catch(e){
    return ok({ ok:false, error:e.message||'spark failed' }, 500);
  }
}
