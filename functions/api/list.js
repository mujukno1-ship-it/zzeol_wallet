// 상승/급등/급락 리스트 통합 API
export const onRequestGet = async ({ request }) => {
  const url = new URL(request.url);
  const type = url.searchParams.get("type") || "rising";

  const markets = await allKRWMarkets();
  const r = await fetch("https://api.upbit.com/v1/ticker?markets=" + encodeURIComponent(markets), {
    headers: { accept: "application/json" },
    cf: { cacheTtl: 2, cacheEverything: true },
  });
  const j = await r.json();
  const list = j.map(x => ({
    name: x.market.replace("KRW-",""),
    price: x.trade_price,
    change: (x.signed_change_price / x.prev_closing_price) * 100
  }));

  let filtered = list;
  if(type==="rising") filtered = list.sort((a,b)=>b.change-a.change).slice(0,10);
  else if(type==="spike") filtered = list.filter(x=>x.change>=3).sort((a,b)=>b.change-a.change).slice(0,20);
  else if(type==="dump")  filtered = list.filter(x=>x.change<=-3).sort((a,b)=>a.change-b.change).slice(0,20);

  return respond({ ok:true, list:filtered }, 200, 2);
};

async function allKRWMarkets(){
  const r = await fetch("https://api.upbit.com/v1/market/all", { headers: { accept: "application/json" }});
  const j = await r.json();
  return j.filter(x=>x.market.startsWith("KRW-")).map(x=>x.market).join(",");
}
const respond=(obj,code=200,ttl=0)=>new Response(JSON.stringify(obj),{
  status:code,
  headers:{
    "content-type":"application/json; charset=utf-8",
    "access-control-allow-origin":"*",
    ...(ttl?{"cache-control":`max-age=${ttl}, s-maxage=${ttl}`}:{})
  }
});
