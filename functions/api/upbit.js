export const onRequestGet = async ({ request }) => {
  const url = new URL(request.url);
  const market = url.searchParams.get("market") || "KRW-ETH";

  const r = await fetch(
    "https://api.upbit.com/v1/ticker?markets=" + encodeURIComponent(market),
    { headers: { accept: "application/json" } }
  );
  if (!r.ok) {
    return new Response(JSON.stringify({ ok:false, status:r.status }), {
      status: r.status,
      headers: cors()
    });
  }
  const j = await r.json();
  const t = j[0];
  const out = {
    market: t.market,
    trade_price: t.trade_price,
    signed_change_price: t.signed_change_price,
    prev_closing_price: t.prev_closing_price,
    ask_price: t.ask_price,
    bid_price: t.bid_price,
    timestamp: t.timestamp
  };
  return new Response(JSON.stringify(out), { headers: json() });
};

const json = () => ({
  "content-type": "application/json; charset=utf-8",
  "cache-control": "max-age=3, s-maxage=3",
  ...cors()
});
const cors = () => ({
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,OPTIONS"
});
