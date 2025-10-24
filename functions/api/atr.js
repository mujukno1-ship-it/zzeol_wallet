// ATR proxy (Cloudflare Pages Functions)
// GET /api/atr?market=KRW-ETH&len=14
// 응답: { ok:true, atr: number }

export const onRequestGet = async ({ request }) => {
  try {
    const { searchParams } = new URL(request.url);
    const market = searchParams.get('market') || 'KRW-ETH';
    const len = Math.max(2, Math.min(100, Number(searchParams.get('len') || 14)));

    const r = await fetch(
      `https://api.upbit.com/v1/candles/minutes/1?market=${encodeURIComponent(market)}&count=${len + 1}`,
      { headers: { accept: "application/json" }, cf: { cacheTtl: 3, cacheEverything: true } }
    );
    if (!r.ok) throw new Error('upbit candles ' + r.status);
    const cs = await r.json();
    if (!Array.isArray(cs) || cs.length < len + 1) return json({ ok:false, error:'not-enough-candles' }, 200, 2);

    // TR = max(H-L, |H-prevC|, |L-prevC|)
    let trs = [];
    for (let i = 0; i < len; i++) {
      const c = cs[i];
      const prev = cs[i+1];
      const h = Number(c.high_price||0), l = Number(c.low_price||0), pc = Number(prev.trade_price||prev.close||prev.candle_acc_trade_price||0);
      const tr = Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc));
      trs.push(tr);
    }
    const atr = trs.reduce((a,b)=>a+b,0) / trs.length;
    return json({ ok:true, atr }, 200, 3);
  } catch (e) {
    return json({ ok:false, error:String(e) }, 500);
  }
};
const json=(obj,code=200,ttl=0)=>new Response(JSON.stringify(obj),{status:code,headers:{
  "content-type":"application/json; charset=utf-8",
  "access-control-allow-origin":"*",
  ...(ttl?{"cache-control":`max-age=${ttl}, s-maxage=${ttl}`}:{})
}});
