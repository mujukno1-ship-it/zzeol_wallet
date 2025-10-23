// api/upbit.js
const NAME2SYMBOL = {
  '비트코인': 'BTC',
  '이더리움': 'ETH',
  '솔라나': 'SOL',
  '리플': 'XRP',
  '에이다': 'ADA',
  '시바이누': 'SHIB',
};

export default async function handler(req, res) {
  try {
    // symbol 인자 정리 (한글/영문/market 모두 허용)
    let q = (req.query.symbol || req.query.q || '').toString().trim();
    if (!q) return res.status(400).json({ error: 'symbol is required' });

    q = NAME2SYMBOL[q] || q;               // 한글 → 심볼
    q = q.toUpperCase();
    const market = q.startsWith('KRW-') ? q : `KRW-${q}`;

    const url = `https://api.upbit.com/v1/ticker?markets=${encodeURIComponent(market)}`;

    // Upbit 퍼블릭 API 호출 (키 필요 없음)
    const r = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'zzeol_wallet (serverless)'
      },
      // Vercel Node 22 런타임에선 기본 keepalive/https ok
      // timeout 필요하면 AbortController 써도 됨
    });

    if (!r.ok) {
      const text = await r.text().catch(() => '');
      return res.status(r.status).json({ error: 'upbit_bad_status', status: r.status, body: text });
    }

    const arr = await r.json();
    if (!Array.isArray(arr) || !arr.length) {
      return res.status(404).json({ error: 'no_data' });
    }

    const t = arr[0];
    const payload = {
      market: t.market,                       // "KRW-SHIB"
      price: num(t.trade_price),              // 현재가
      change: t.change,                       // "RISE" | "EVEN" | "FALL"
      changeRate: num(t.signed_change_rate),  // 변동률(소수)
      changePrice: num(t.signed_change_price),
      accVolume24h: num(t.acc_trade_volume_24h),
      accPrice24h: num(t.acc_trade_price_24h),
      timestamp: t.timestamp,
    };

    return res.status(200).json(payload);
  } catch (e) {
    console.error('[upbit]', e);
    return res.status(500).json({ error: 'internal_error' });
  }
}

function num(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}
