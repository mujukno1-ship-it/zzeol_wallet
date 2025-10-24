// api/upbit.js
import { roundByUpbitTick, fetchJSON } from "../utils/num.js";

export const config = { runtime: "edge" }; // 응답 빠르게

const UPBIT_TICKER = "https://api.upbit.com/v1/ticker?markets=";
const UPBIT_ORDERBOOK = "https://api.upbit.com/v1/orderbook?markets=";

const MAP = {
  BTC: "KRW-BTC", ETH: "KRW-ETH", XRP: "KRW-XRP", SHIB: "KRW-SHIB",
  ADA: "KRW-ADA", SOL: "KRW-SOL", DOGE: "KRW-DOGE",
};

export default async function handler(req) {
  try {
    const { searchParams } = new URL(req.url);
    const symbol = (searchParams.get("symbol") || "BTC").toUpperCase();
    const market = MAP[symbol];
    if (!market) {
      return new Response(JSON.stringify({ error: "UNSUPPORTED_SYMBOL" }), { status: 400 });
    }

    // 병렬로 가격/호가 호출
    const [ticker] = await Promise.all([
      fetchJSON(UPBIT_TICKER + market, { timeout: 3500, retries: 1 }),
    ]);

    // orderbook은 느릴 수 있어 분리/옵션 호출
    let order = null;
    try {
      const ob = await fetchJSON(UPBIT_ORDERBOOK + market, { timeout: 2000, retries: 0 });
      order = ob?.[0] || null;
    } catch (_) {}

    const t = Array.isArray(ticker) ? ticker[0] : ticker;
    const price = Number(t?.trade_price ?? 0);
    const prev = Number(t?.prev_closing_price ?? 0);
    const change = ((price - prev) / (prev || price)) * 100;

    let bid = price, ask = price;
    if (order && order.orderbook_units && order.orderbook_units[0]) {
      bid = Number(order.orderbook_units[0].bid_price);
      ask = Number(order.orderbook_units[0].ask_price);
    }

    // 틱 반올림(저가코인 단위 문제 해결)
    const buyTarget  = roundByUpbitTick(price * 0.9995);
    const sellTarget = roundByUpbitTick(price * 1.0015);
    const stopLoss   = roundByUpbitTick(price * 0.99);

    return new Response(JSON.stringify({
      symbol,
      market,
      price,
      prev,
      change,
      bid,
      ask,
      buyTarget,
      sellTarget,
      stopLoss,
      ts: Date.now(),
    }), { headers: { "content-type": "application/json" }});
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 500 });
  }
}
