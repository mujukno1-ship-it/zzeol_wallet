// /api/market.js
// BTC Dominance (CoinGecko) + 1m ATR(14), VWAP (Binance)
function toNum(x){const n=Number(x);return Number.isFinite(n)?n:null;}

export default async function handler(req, res) {
  try {
    // BTC 도미넌스
    const gR = await fetch('https://api.coingecko.com/api/v3/global', { headers:{Accept:'application/json'} });
    const g  = gR.ok ? await gR.json() : null;
    const btcDom = g?.data?.market_cap_percentage?.btc ?? null;

    // BTCUSDT 1m 캔들 300개
    const kR = await fetch('https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1m&limit=300');
    const kl = kR.ok ? await kR.json() : [];

    const candles = kl.map(k => ({
      t: k[0], o: toNum(k[1]), h: toNum(k[2]), l: toNum(k[3]), c: toNum(k[4]), v: toNum(k[5])
    }));

    // ATR(14)
    let trs = [];
    for (let i=1;i<candles.length;i++){
      const {h,l} = candles[i];
      const pc = candles[i-1].c;
      const tr = Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc));
      trs.push(tr);
    }
    const n=14;
    let atr = null;
    if (trs.length >= n) {
      const last = trs.slice(-n);
      atr = last.reduce((a,b)=>a+b,0)/n;
    }

    // VWAP (세션=최근 60분 누적)
    const ses = candles.slice(-60);
    let pv=0, vv=0;
    for (const k of ses){
      const tp = (k.h + k.l + k.c)/3;
      pv += tp * (k.v||0);
      vv += (k.v||0);
    }
    const vwap = vv ? pv/vv : null;

    return res.status(200).json({ btcDominance: btcDom, atr, vwap, ts: Date.now() });
  } catch (e) {
    return res.status(500).json({ error: 'market_internal', message: String(e) });
  }
}
