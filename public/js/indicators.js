// public/js/indicators.js
// 아주 간단한 참고용 시그널(테스트용 계산식)
export function makeSignal(premium) {
  if (!premium) return null;
  const price = premium.upbitPrice ?? 0;
  const k = Number(premium.premiumPct ?? 0);

  // 프리미엄이 높을수록 위험도 상향
  const risk = Math.min(5, Math.max(1, Math.round(Math.abs(k) / 1.2) + 1));

  // 데모: 단순 비율로 목표/손절 계산
  const buy  = Math.round(price * 0.998);     // 미세 눌림 매수
  const sell = Math.round(price * (k > 0 ? 1.02 : 1.01)); // 프리미엄 양수면 조금 더 타이트
  const stop = Math.round(price * 0.985);

  return { price, buy, sell, stop, risk };
}

export function makeOneLine(premium, onchain) {
  if (!premium || !onchain) return '데이터 로딩중…';
  const k = Number(premium.premiumPct ?? 0);
  const dir = k > 0 ? '국내 고평가' : (k < 0 ? '국내 저평가' : '동일');
  const tvl = Number(onchain.tvl ?? 0);
  const tvlMood = tvl > 500_000_000 ? '📈 유동성 양호' : '📉 유동성 약함';
  return `시장 눈치 보기. 손절 라인 먼저! (${dir}, TVL: ${tvlMood})`;
}
