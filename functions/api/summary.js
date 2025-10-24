// upbit + kimchi + onchain 통합 (내부 엔드포인트 호출)
export const onRequestGet = async ({ request }) => {
  const url = new URL(request.url);
  const market = url.searchParams.get("market") || "KRW-ETH";

  try {
    const [upRes, kimRes, ocRes] = await Promise.all([
      fetch("https://api.upbit.com/v1/ticker?markets=" + encodeURIComponent(market), {
        headers: { accept: "application/json" },
        cf: { cacheTtl: 2, cacheEverything: true },
      }),
      fetch(new URL("/api/kimchi", url.origin), { cf: { cacheTtl: 3, cacheEverything: true } }),
      fetch(new URL("/api/onchain", url.origin), { cf: { cacheTtl: 15, cacheEverything: true } }),
    ]);

    const upArr  = await safeJson(upRes);   // [{...}] or null
    const kimchi = await safeJson(kimRes);  // { kimchi, ... } or null
    const oc     = await safeJson(ocRes);   // { ok, stables } or null

    const upbit = upArr?.[0]
      ? {
          market: upArr[0].market,
          trade_price: upArr[0].trade_price,
          signed_change_price: upArr[0].signed_change_price,
          prev_closing_price: upArr[0].prev_closing_price,
          ask_price: upArr[0].ask_price,
          bid_price: upArr[0].bid_price,
          timestamp: upArr[0].timestamp,
        }
      : null;

    return respond({ upbit, kimchi, onchain: oc ?? { ok:false }, ts: Date.now() }, 200, 2);
  } catch (e) {
    return respond({ ok:false, error:String(e) }, 500, 0);
  }
};

async function safeJson(res) {
  if (!res || !res.ok) return null;
  const ct = (res.headers.get("content-type") || "").toLowerCase();
  if (ct.includes("application/json")) return res.json();
  const t = await res.text();
  try { return JSON.parse(t); } catch { return null; }
}
const respond = (obj, code=200, maxAge=0)=>new Response(JSON.stringify(obj),{
  status: code,
  headers: {
    "content-type":"application/json; charset=utf-8",
    "access-control-allow-origin":"*",
    ...(maxAge?{"cache-control":`max-age=${maxAge}, s-maxage=${maxAge}`}:{})
  }
});
