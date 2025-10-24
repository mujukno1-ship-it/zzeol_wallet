// 업비트 KRW-BTC vs 바이낸스 BTCUSDT + 환율 → 김치 프리미엄 계산
export const onRequestGet = async () => {
  try{
    const [up, bin, fx] = await Promise.all([
      fetch("https://api.upbit.com/v1/ticker?markets=KRW-BTC").then(r=>r.json()),
      fetch("https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT").then(r=>r.json()),
      fetch("https://open.er-api.com/v6/latest/USD").then(r=>r.json()).catch(()=>({rates:{KRW:1350}}))
    ]);
    const krw   = up?.[0]?.trade_price ?? 0;   // KRW
    const usd   = Number(bin?.price ?? 0);     // USDT≈USD
    const usdkrw = fx?.rates?.KRW ?? 1350;
    const kimchi = usd>0 && usdkrw>0 ? ((krw/(usd*usdkrw))-1)*100 : null;

    return json({ krw, usd, usdkrw, kimchi });
  }catch(e){
    return json({ ok:false, error:String(e) }, 500);
  }
};

const json = (obj, code=200)=>new Response(JSON.stringify(obj), {
  status: code,
  headers: {
    "content-type":"application/json; charset=utf-8",
    "access-control-allow-origin":"*",
    "cache-control":"max-age=5, s-maxage=5"
  }
});
