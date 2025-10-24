// /api/tick.js
// 최근 체결 200건으로 간단 CVD/체결속도 계산
export default async function handler(req, res) {
  try {
    const raw = (req.query.symbol || 'BTC').toString().toUpperCase();
    const market = raw.startsWith('KRW-') ? raw : `KRW-${raw}`;
    const count = Math.min(parseInt(req.query.count||'200',10), 200);
    const url = `https://api.upbit.com/v1/trades/ticks?market=${encodeURIComponent(market)}&count=${count}`;
    const r = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!r.ok) return res.status(r.status).json({ error: 'upbit_trades_bad_status' });

    const ticks = await r.json(); // 최근 체결 역순(최신→과거)
    if (!Array.isArray(ticks) || ticks.length === 0) {
      return res.status(200).json({ market, cvd: 0, speed: 0 });
    }

    let cvd = 0; // 누적 체결델타(매수체결량 - 매도체결량)
    let firstTs = ticks[ticks.length-1].timestamp;
    let lastTs  = ticks[0].timestamp;

    for (const t of ticks) {
      const vol = Number(t.trade_volume || 0);
      if (t.ask_bid === 'BID') cvd += vol;     // 매수 체결
      else if (t.ask_bid === 'ASK') cvd -= vol;// 매도 체결
    }
    const sec = Math.max(1, Math.round((lastTs - firstTs)/1000));
    const speed = ticks.length / sec; // 초당 체결 건수(대략적인 체결속도)

    return res.status(200).json({ market, cvd, speed, windowSec: sec, samples: ticks.length });
  } catch (e) {
    return res.status(500).json({ error: 'tick_internal', message: String(e) });
  }
}
