// /api/upbit.js
export default async function handler(req, res) {
  try {
    const symbol = (req.query.symbol || 'BTC').toUpperCase();
    const market = symbol.startsWith('KRW-') ? symbol : `KRW-${symbol}`;
    const r = await fetch(`https://api.upbit.com/v1/ticker?markets=${encodeURIComponent(market)}`);
    if (!r.ok) return res.status(500).json({ error: 'upbit_fetch_failed' });
    const [data] = await r.json();

    const price = data.trade_price;
    const changeRate = data.signed_change_rate;
    const changePrice = data.signed_change_price;

    return res.status(200).json({
      market,
      price,
      changeRate,
      changePrice,
      high: data.high_price,
      low: data.low_price,
      volume: data.acc_trade_price_24h,
      timestamp: data.timestamp
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'upbit_internal', message: String(err) });
  }
}
