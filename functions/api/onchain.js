// FullSet ∞ On-Chain Flow v1.1
export const onRequestGet = async () => {
  try{
    const res = await fetch("https://stablecoins.llama.fi/stablecoins?includePrices=true", {
      headers:{accept:"application/json"}, cf:{cacheTtl:120, cacheEverything:true}
    });
    const j = await res.json();
    const totalUSD = j.totalCirculatingUSD ?? 0;
    const change24h = j.change_24h ?? 0;
    const assets = Array.isArray(j.peggedAssets) ? j.peggedAssets : [];
    const coins = assets.filter(x=>["Tether","USDC","Dai","DAI"].includes(x.name))
      .map(c=>({ symbol:c.symbol, mcapUSD:c.circulating?.[0]?.totalCirculatingUSD ?? 0, change24h:c.change_24h ?? 0 }));
    let krwTotal = totalUSD * 1350;
    if(!krwTotal || krwTotal < 1e6){
      const b = await fetch("https://api.coinmetrics.io/v4/timeseries/asset-metrics?assets=usdt&metrics=CapMrktCurUSD");
      const jb = await b.json(); const cap = parseFloat(jb?.data?.[0]?.CapMrktCurUSD ?? 96000000000); krwTotal = cap*1350;
    }
    const outflowAll = coins.every(c=>c.change24h<0);
    const risk = outflowAll ? "⚠️ 자금 이탈 경고" : (change24h<0 ? "주의" : "정상");
    return json({ ok:true, total:{ mcapKRW:Math.round(krwTotal), change24h, risk }, coins, src:"defillama" });
  }catch(e){ return json({ ok:false, error:String(e), fallback:true }, 500); }
};
const json=(obj,code=200)=>new Response(JSON.stringify(obj),{status:code,headers:{"content-type":"application/json; charset=utf-8","access-control-allow-origin":"*","cache-control":"max-age=60, s-maxage=60"}});
