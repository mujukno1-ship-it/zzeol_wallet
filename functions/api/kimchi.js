export const onRequestGet = async () => {
  try{
    const [upRes, cbRes, fxRes] = await Promise.all([
      fetch("https://api.upbit.com/v1/ticker?markets=KRW-BTC"),
      fetch("https://api.coinbase.com/v2/prices/BTC-USD/spot"),
      fetch("https://open.er-api.com/v6/latest/USD").catch(()=>null),
    ]);
    const up = await safeJson(upRes);
    const cb = await safeJson(cbRes);
    const fx = fxRes ? await safeJson(fxRes) : { rates:{ KRW:1350 } };

    const krw = up?.[0]?.trade_price ?? 0;
    const usd = Number(cb?.data?.amount ?? 0);
    const usdkrw = fx?.rates?.KRW ?? 1350;

    const kimchi = (usd>0 && usdkrw>0) ? ((krw/(usd*usdkrw))-1)*100 : null;
    return json({ krw, usd, usdkrw, kimchi });
  }catch(e){ return json({ ok:false, error:String(e) }, 500); }
};
async function safeJson(res){ if(!res||!res.ok) return null; const ct=(res.headers.get("content-type")||"").toLowerCase(); if(ct.includes("json")) return res.json(); const t=await res.text(); try{return JSON.parse(t);}catch{return null;} }
const json=(obj,code=200)=>new Response(JSON.stringify(obj),{status:code,headers:{"content-type":"application/json; charset=utf-8","access-control-allow-origin":"*","cache-control":"max-age=5, s-maxage=5"}});
