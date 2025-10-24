// 온체인 지표 샘플: DefiLlama Stablecoin Summary
export const onRequestGet = async () => {
  try{
    const stables = await fetch("https://stablecoins.llama.fi/summary").then(r=>r.json());
    return new Response(JSON.stringify({ ok:true, stables }), {
      headers: { "content-type":"application/json; charset=utf-8", "access-control-allow-origin":"*" }
    });
  }catch(e){
    return new Response(JSON.stringify({ ok:false, error:String(e) }), {
      status:500,
      headers: { "content-type":"application/json; charset=utf-8", "access-control-allow-origin":"*" }
    });
  }
};
