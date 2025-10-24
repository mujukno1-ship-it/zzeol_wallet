// api/upbit.js
// Node 22 (Vercel)의 Edge/Serverless 함수. 업비트 현재가 + 최우선 호가(bid/ask) + 스프레드 반환

export const config = {
  runtime: 'edge', // 또는 serverless (둘 다 동작)
};

const NAME2SYMBOL = {
  '비트코인': 'BTC', 'BTC': 'BTC',
  '이더리움': 'ETH', 'ETH': 'ETH',
  '솔라나': 'SOL', 'SOL': 'SOL',
  '리플': 'XRP', 'XRP': 'XRP',
  '에이다': 'ADA', 'ADA': 'ADA',
  '시바이누': 'SHIB', 'SHIB': 'SHIB',
};

function json(res, status = 200) {
  return new Response(JSON.stringify(res), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'access-control-allow-origin': '*',
    },
  });
}

async function fetchJson(url, timeoutMs = 5000) {
  const controller = new AbortController();
  const tmr = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const r = await fetch(url, { signal: controller.signal });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } finally {
    clearTimeout(tmr);
  }
}

export default async function handler(req) {
  try {
    const { searchParams } = new URL(req.url);
    const raw = (searchParams.get('symbol') || '').trim();
    const sym = NAME2SYMBOL[raw] || raw.toUpperCase();

    if (!sym) return json({ error: 'Missing symbol' }, 400);

    const market = `KRW-${sym}`;
    // 업비트: ticker + orderbook
    const [ticker, orderbook] = await Promise.all([
      fetchJson(`https://api.upbit.com/v1/ticker?markets=${market}`),
      fetchJson(`https://api.upbit.com/v1/orderbook?markets=${market}`),
    ]);

    if (!ticker?.length) return json({ error: 'Ticker not found' }, 404);
    if (!orderbook?.length) return json({ error: 'Orderbook not found' }, 404);

    const t = ticker[0];
    const ob = orderbook[0];
    const u0 = ob.orderbook_units?.[0] || {};
    const bid = Number(u0.bid_price ?? NaN);
    const ask = Number(u0.ask_price ?? NaN);
    const price = Number(t.trade_price ?? NaN);
    const changeRate = Number(t.signed_change_rate ?? 0) * 100; // %

    const spread = isFinite(ask - bid) ? ask - bid : null;

    return json({
      symbol: sym,
      market,
      price,
      changeRate, // %
      bid,        // 최우선 매수
      ask,        // 최우선 매도
      spread,
      ts: Date.now(),
    });
  } catch (e) {
    return json({ error: String(e?.message || e) }, 500);
  }
}
