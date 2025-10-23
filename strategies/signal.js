// strategies/signal.js
// 업비트(시장) + 온체인 신호를 합친다
export function combineSignals({ upbit, onchain }) {
  // ① 시장(업비트) 신호: 변동률 기준 (예: ±0.3%)
  const cr = Number(upbit?.changeRate ?? 0); // 예: 0.0123 → 1.23%
  const market =
    cr >= 0.003 ? 'BUY' :
    cr <= -0.003 ? 'SELL' : 'HOLD';

  // ② 온체인 신호: 예시 기준(임계값은 원하면 조정 가능)
  const mvrvZ = Number(onchain?.mvrvZ ?? 0);           // MVRV Z-Score
  const funding = Number(onchain?.fundingRate ?? 0);   // 펀딩비

  let chain = 'HOLD';
  if (mvrvZ < 0 && funding <= 0) chain = 'BUY';        // 저평가 & 숏 치우침
  else if (mvrvZ >= 6 || funding > 0.02) chain = 'SELL'; // 과열 or 롱 과열

  // ③ 컨플루언스(둘 다 같은 방향이면 강한 신호, 아니면 대기)
  let both = 'HOLD';
  if (market === 'BUY' && chain === 'BUY') both = 'BUY';
  else if (market === 'SELL' && chain === 'SELL') both = 'SELL';

  // ④ 설명(툴팁/디버그용)
  const reason = [];
  reason.push(`market:${market} (Δ=${(cr*100).toFixed(2)}%)`);
  reason.push(`chain:${chain} (mvrvZ=${mvrvZ}, funding=${(funding*100).toFixed(2)}%)`);
  if (both !== 'HOLD') reason.push(`confluence:${both}`);

  return { market, chain, both, reason };
}
