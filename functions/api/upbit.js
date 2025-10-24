export const onRequestGet = async ({ request }) => {
  const url = new URL(request.url);
  const market = url.searchParams.get("market") || "KRW-ETH";
  const r = await fetch("https://api.upbit.com/v1/ticker?markets=" + encodeURIComponent(market),
    { headers: { accept: "application/json" }});
  if (!r.ok) return respond({ ok:false, status:r.status }, r.status);
  const t = (await r.json())[0];
  return respond({
    market:t.market, trade_price:t.trade_price, signed_change_price:t.signed_change_price,
    prev_closing_price:t.prev_closing_price, ask_price:t.ask_price, bid_price:t.bid_price, timestamp:t.timestamp
  }, 200, 3);
};
const headers=(max=0)=>({"content-type":"application/json; charset=utf-8","access-control-allow-origin":"*",...(max?{"cache-control":`max-age=${max}, s-maxage=${max}`}:{})});
const respond=(obj,code=200,cache=0)=>new Response(JSON.stringify(obj),{status:code,headers:headers(cache)});
