// api/kimchi.js
import { fetchJSON } from "../utils/num.js";

export const config = { runtime: "edge" };

const MAP = {
  BTC: { upbit: "KRW-BTC", binance: "BTCUSDT" },
  ETH: { upbit: "KRW-ETH", binance: "ETHUSDT" },
  XRP: { upbit: "KRW-XRP", binance: "XRPUSDT" },
  SHIB:{ upbit: "KRW-SHIB",binance: "SHIBUSDT" },
  ADA: { upbit: "KRW-ADA", binance: "ADAUSDT" },
  SOL: { upbit: "KRW-SOL", binance: "SOLUSDT" },
};

export default async function handler(req) {
  try {
    const { searchParams } = new URL(req.url);
    const symbol = (searchParams.get("symbol") || "BTC").toUpperCase();
    const pair = MAP[symbol];
    if (!pair) return new Response(JSON.stringify({ error: "UNSUPPORTED_SYMBOL" }), { status: 400 });

    const [up, bi, fx] = await Promise.all([
      fetchJSON(`https://api.upbit.com/v1/ticker?markets=${pair.upbit}`, { timeout: 3000 }),
      fetchJSON(`https://api.binance.com/api/v3/ticker/price?symbol=${pair.binance}`, { timeout: 3000 }),
      fetchJSON(`https://api.exchangerate.host/latest?base=USD&symbols=KRW`, { timeout: 3000 }),
    ]);

    const upkrw = Number(up?.[0]?.trade_price ?? 0);
    const usdt  = Number(bi?.price ?? 0);
    const usdkrw = Number(fx?.rates?.KRW ?? 0) || 1350; // 실패시 안전 fallback

    const refKrw = usdt * usdkrw;
    const premium = refKrw ? (upkrw / refKrw - 1) * 100 : 0;

    return new Response(JSON.stringify({
      symbol,
      upbit_krw: upkrw,
      binance_usdt: usdt,
      usdkrw,
      kimchi: premium, // %
      ts: Date.now(),
    }), { headers: { "content-type": "application/json" }});
  } catch (e) {
    // 실패시 0% 반환(알고리즘 왜곡 방지)
    return new Response(JSON.stringify({ symbol: "UNKNOWN", kimchi: 0, fallback: true }), { status: 200 });
  }
}
