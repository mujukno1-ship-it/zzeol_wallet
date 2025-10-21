/* strategies/exploder.js
 * '제로지'처럼 단기간에 터지는 급등 코인만 뽑기 위한 폭등 스코어.
 * candles: 최근 60~120개 분/분봉(or 3m/5m) [{t,o,h,l,c,v}] 권장
 * 반환: 0~100 점수 + 태그
 */
const Exploder = (() => {
  // ===== 유틸 =====
  const last = a => a[a.length - 1];
  const clip = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

  function sma(arr, n) {
    if (arr.length < n) return null;
    let s = 0;
    for (let i = arr.length - n; i < arr.length; i++) s += arr[i];
    return s / n;
  }

  function atr(candles, n = 14) {
    const tr = [];
    for (let i = 0; i < candles.length; i++) {
      if (i === 0) { tr.push(candles[i].h - candles[i].l); continue; }
      const h = candles[i].h, l = candles[i].l, pc = candles[i - 1].c;
      tr.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
    }
    let a = sma(tr, n);
    if (a == null) return tr.at(-1) || 0;
    for (let i = candles.length - n + 1; i < candles.length; i++) {
      a = (a * (n - 1) + tr[i]) / n;
    }
    return a;
  }

  function rollingMaxHigh(candles, n) {
    let m = -Infinity;
    for (let i = candles.length - n; i < candles.length; i++) m = Math.max(m, candles[i].h);
    return m;
  }

  // ===== 메인: 폭등 스코어 =====
  function score(candles) {
    if (!candles || candles.length < 40) return 0;

    // 가격/거래량 배열
    const C = candles.map(c => c.c);
    const V = candles.map(c => c.v || 0);
    const i = C.length - 1;

    // 분봉 기준: 5개/15개 변화율 (1m 봉이면 5m/15m 느낌)
    const pct = (now, prev) => (prev ? ((now - prev) / prev) * 100 : 0);
    const ch5  = pct(C[i], C[i - 5]  ?? C[i]);   // 5개 전 대비
    const ch15 = pct(C[i], C[i - 15] ?? C[i]);   // 15개 전 대비

    // 거래량 스파이크 (최근 1캔들 vs 최근 30캔들 평균)
    const vAvg = sma(V, Math.min(30, V.length)) || 0.000001;
    const vSpike = last(V) / vAvg; // 1.0 기준 이상이면 스파이크

    // 60개 범위 고점 돌파 = 추세적 폭발
    const breakout = last(C) >= rollingMaxHigh(candles, Math.min(60, candles.length)) ? 1 : 0;

    // ATR 변동성 확장(%) - 현재가 대비
    const atrVal = atr(candles, 14);
    const atrPct = (atrVal / (last(C) || 1)) * 100;

    // 스코어 합산 (제로지형 ‘순간 폭발’ 강조)
    let s = 0;
    s += Math.max(0, ch5)  * 4.5;   // 5m 급등 가중치
    s += Math.max(0, ch15) * 2.8;   // 15m 추세 가중치
    s += Math.max(0, (vSpike - 1)) * 25;   // 볼륨 스파이크
    if (breakout) s += 20;                 // 돌파 보너스
    if (atrPct > 2) s += (atrPct - 2) * 5; // 변동성 확장 보너스

    return clip(s, 0, 100);
  }

  function tag(s) {
    if (s >= 85) return '🚀 폭등 모드!';
    if (s >= 70) return '불장 신호!';
    if (s >= 55) return '급등 예열';
    return '관망';
  }

  return { score, tag };
})();
