// /api/upbit.js
export default async function handler(req, res) {
  try {
    const { symbol = 'BTC' } = req.query;
    const market = symbol.startsWith('KRW-') ? symbol : `KRW-${symbol}`;
    const url = `https://api.upbit.com/v1/ticker?markets=${encodeURIComponent(market)}`;

    const r = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!r.ok) return res.status(r.status).json({ error: 'upbit_bad_status', status: r.status });

    const [tick] = await r.json();
    res.status(200).json({
      market: tick.market,
      price: tick.trade_price,
      change: tick.change, // RISE/FALL/EVEN
      changeRate: tick.signed_change_rate,
      timestamp: tick.timestamp,
    });
  } catch (e) {
    res.status(500).json({ error: 'upbit_fetch_failed', message: String(e) });
  }
}
