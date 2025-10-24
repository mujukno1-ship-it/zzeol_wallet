// /api/onchain.js
export default async function handler(req, res) {
  try {
    const symbol = (req.query.symbol || '').toString().toUpperCase();
    if (!symbol) {
      return res.status(400).json({ error: 'symbol is required' });
    }

    // ─────────────── 기본 데이터 ───────────────
    const [upbitRes, binanceRes] = await Promise.all([
      fetch(`https://api.upbit.com/v1/ticker?markets=KRW-${symbol}`).then(r => r.json()).catch(() => []),
      fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}USDT`).then(r => r.json()).catch(() => null)
    ]);

    const upbit = Array.isArray(upbitRes) ? upbitRes[0] : {};
    const binance = binanceRes || {};

    const priceKRW = Number(upbit?.trade_price ?? 0);
    const priceUSDT = Number(binance?.price ?? 0);
    const usdkrw = 1350; // 환율 고정 (실시간 API로도 교체 가능)
    const kimchi = priceUSDT > 0 ? ((priceKRW / (priceUSDT * usdkrw)) - 1) * 100 : 0; // %

    // ─────────────── 온체인 더미 데이터 (실제 연동시 교체) ───────────────
    const mvrvZ = randomRange(-1.2, 7.5);  // MVRV Z-Score
    const fundingRate = randomRange(-0.02, 0.03); // 펀딩비

    // ─────────────── 통합 판단 ───────────────
    const marketSignal =
      upbit?.signed_change_rate > 0.003 ? 'BUY' :
      upbit?.signed_change_rate < -0.003 ? 'SELL' : 'HOLD';

    const chainSignal =
      mvrvZ < 0 && fundingRate < 0 ? 'BUY' :
      mvrvZ > 6 || fundingRate > 0.02 ? 'SELL' : 'HOLD';

    // 김프 기반 보정
    let kimchiSignal = 'NEUTRAL';
    if (kimchi >= 2) kimchiSignal = 'OVERHEAT';
    else if (kimchi <= -0.5) kimchiSignal = 'UNDERVALUED';

    // 통합 판단
    let finalSignal = 'HOLD';
    if (marketSignal === 'BUY' && chainSignal === 'BUY') finalSignal = 'BUY';
    else if (marketSignal === 'SELL' && chainSignal === 'SELL') finalSignal = 'SELL';

    // 김프 보정 반영
    if (finalSignal === 'BUY' && kimchiSignal === 'UNDERVALUED') finalSignal = 'STRONG BUY';
    if (finalSignal === 'SELL' && kimchiSignal === 'OVERHEAT') finalSignal = 'STRONG SELL';

    // ─────────────── 결과 ───────────────
    return res.status(200).json({
      symbol,
      priceKRW,
      priceUSDT,
      kimchi,
      kimchiSignal,
      mvrvZ,
      fundingRate,
      marketSignal,
      chainSignal,
      finalSignal,
      reason: `업비트:${marketSignal}, 온체인:${chainSignal}, 김프:${kimchiSignal} (${kimchi.toFixed(2)}%)`,
      timestamp: Date.now()
    });
  } catch (e) {
    console.error('[onchain]', e);
    return res.status(500).json({ error: 'internal_error', message: e.message });
  }
}

// ─────────────── 유틸 ───────────────
function randomRange(min, max) {
  return Math.random() * (max - min) + min;
}
