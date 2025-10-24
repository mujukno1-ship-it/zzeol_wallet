// /api/orderbook.js
export default async function handler(req, res) {
  try {
    const raw = (req.query.symbol || 'BTC').toString().toUpperCase();
    const market = raw.startsWith('KRW-') ? raw : `KRW-${raw}`;
    const url = `https://api.upbit.com/v1/orderbook?markets=${encodeURIComponent(market)}`;
    const r = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!r.ok) return res.status(r.status).json({ error: 'upbit_orderbook_bad_status' });
    const [ob] = await r.json();

    const units = (ob?.orderbook_units || []).slice(0, 15); // 상위 15호가
    const bidSum = sum(units.map(u => u.bid_size)); // 매수 대기량
    const askSum = sum(units.map(u => u.ask_size)); // 매도 대기량
    const total = bidSum + askSum;
    const bidRatio = total ? bidSum / total : 0;
    const askRatio = total ? askSum / total : 0;
    // 불균형 (-1 ~ +1): +면 매수벽 우세
    const imbalance = total ? (bidSum - askSum) / total : 0;

    return res.status(200).json({
      market,
      bidSum, askSum, bidRatio, askRatio, imbalance
    });
  } catch (e) {
    return res.status(500).json({ error: 'orderbook_internal', message: String(e) });
  }
}
const sum = a => a.reduce((x,y)=>x+Number(y||0),0);
