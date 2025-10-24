// upbit + kimchi + onchain 한 번에 묶어서 반환
export const onRequestGet = async ({ request }) => {
  const url = new URL(request.url);
  const market = url.searchParams.get("market") || "KRW-ETH";

  try{
    const [upbit, kimchi, onchain] = await Promise.all([
      fetch("https://api.upbit.com/v1/ticker?markets="+encodeURIComponent(market))
        .then(r=>r.json()).then(j=>j?.[0]),
      (async ()=>{
        const [up, bin, fx] = await Promise.all([
          fetch("https://api.upbit.com/v1/ticker?markets=KRW-BTC").then(r=>r.json()),
          fetch("https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT").then(r=>r.json()),
          fetch("https://open.er-api.com/v6/latest/USD").then(r=>r.json()).catch(()=>({rates:{KRW:1350}}))
        ]);
        const krw   = up?.[0]?.trade_price ?? 0;
        const usd   = Number(bin?.price ?? 0);
        const usdkrw = fx?.rates?.KRW ?? 1350;
        const kimchi = usd>0 && usdkrw>0 ? ((krw/(usd*usdkrw))-1)*100 : null;
        return { krw, usd, usdkrw, kimchi };
      })(),
      fetch("https://stablecoins.llama.fi/summary").then(r=>r.json()).then(d=>({ ok:true, stables:d })).catch(()=>({ok:false}))
    ]);

    return resp({ upbit, kimchi, onchain, ts: Date.now() }, 200, 2);
  }catch(e){
    return resp({ ok:false, error:String(e) }, 500, 0);
  }
};

const resp = (obj, code=200, maxAge=0)=>new Response(JSON.stringify(obj), {
  status: code,
  headers: {
    "content-type":"application/json; charset=utf-8",
    "access-control-allow-origin":"*",
    ...(maxAge?{"cache-control":`max-age=${maxAge}, s-maxage=${maxAge}`}:{})
  }
});
