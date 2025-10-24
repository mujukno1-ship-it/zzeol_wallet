export const onRequestGet = async () => {
  const [up, bin] = await Promise.all([
    fetch("https://api.upbit.com/v1/ticker?markets=KRW-BTC").then(r=>r.json()),
    fetch("https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT").then(r=>r.json())
  ]);
  const krw = up[0]?.trade_price ?? 0;
  const usd = Number(bin?.price ?? 0);
  const usdkrw = await fx();
  const prem = ((krw/(usd*usdkrw))-1)*100;
  return new Response(JSON.stringify({ krw, usd, usdkrw, kimchi: prem }), {
    headers: { "content-type":"application/json; charset=utf-8", "access-control-allow-origin":"*" }
  });
};
async function fx(){
  try{
    const r=await fetch("https://open.er-api.com/v6/latest/USD").then(r=>r.json());
    return r?.rates?.KRW || 1350;
  }catch{ return 1350; }
}
