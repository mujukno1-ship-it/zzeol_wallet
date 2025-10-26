// public/js/modules/risk.js
// 1(낮음) ~ 5(높음)
export function computeRisk({ premiumPctHist, tvlUsd }){
  const vol = stdev(premiumPctHist.slice(-12)); // 최근 2분 변동성
  // TVL 높으면 리스크 ↓
  const tvlFactor = tvlUsd ? clamp(1e11 / (tvlUsd + 1), 0.6, 1.2) : 1.2;
  let base = 2 + 8*vol; // 프리미엄 변동성 기반
  base *= tvlFactor;

  // 범위 고정
  const score = clamp(Math.round(base), 1, 5);
  return score;
}

function stdev(a){
  if(a.length < 2) return 0;
  const m = a.reduce((x,y)=>x+y,0)/a.length;
  const v = a.reduce((s,y)=>s+(y-m)*(y-m),0)/(a.length-1);
  return Math.sqrt(v)/100; // % 스케일 완화
}
function clamp(x, lo, hi){ return Math.max(lo, Math.min(hi, x)); }
