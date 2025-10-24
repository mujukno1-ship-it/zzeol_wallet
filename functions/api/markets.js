export const onRequestGet = async () => {
  const r = await fetch("https://api.upbit.com/v1/market/all");
  const j = await r.json();
  const map = {};
  j.forEach(m=>{
    if(!m.market.startsWith("KRW-")) return;
    const sym = m.market.replace("KRW-","");
    map[sym] = m.market;
    if (m.korean_name) map[m.korean_name.toUpperCase().replace(/\s+/g,'')] = m.market;
  });
  map["비캐"]="KRW-BCH"; map["솔"]="KRW-SOL"; map["리플"]="KRW-XRP";
  return new Response(JSON.stringify({ map }),{headers:{"content-type":"application/json; charset=utf-8","access-control-allow-origin":"*"}});
};
