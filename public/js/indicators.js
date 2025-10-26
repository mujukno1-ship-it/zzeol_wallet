// public/js/modules/indicators.js
import { DEFAULT_STOP_PCT, BASE_TAKE_PCT } from "./config.js";

function avg(a){ return a.length ? a.reduce((x,y)=>x+y,0)/a.length : 0; }
function slope(a){
  if(a.length < 3) return 0;
  const n = a.length;
  const last = a[n-1], prev = a[n-3];
  return last - prev;
}

export function calcSignals({ nowPrice, premiumPctHist, tvlUsd }){
  // 간단 모멘텀: 프리미엄의 최근 기울기
  const kimpSlope = slope(premiumPctHist);
  const kimpAvg   = avg(premiumPctHist.slice(-5));

  // 기본 손절/익절
  const stopPct = DEFAULT_STOP_PCT * (tvlUsd ? 1 : 1.2); // TVL 없으면 보수적으로
  const takePct = BASE_TAKE_PCT + Math.max(0, kimpAvg)*0.002; // 프리미엄 양수면 목표가 약간 높임

  const stopPrice = nowPrice ? Math.round(nowPrice * (1 - stopPct)) : null;
  const buyPrice  = nowPrice || null; // 현 시세 매수 기준
  const sellPrice = nowPrice ? Math.round(nowPrice * (1 + takePct)) : null;

  // 매수/매도 시그널 (아주 단순 첫 버전)
  // - kimp 기울기 상승 & 평균 kimp가 -0.5% 이상이면 "매수 유리"
  // - kimp 평균이 과열(> 3%)이면 "익절/경계"
  let bias = "중립";
  if(kimpSlope > 0 && kimpAvg > -0.5) bias = "매수 유리";
  if(kimpAvg > 3) bias = "익절/경계";

  return { buyPrice, sellPrice, stopPrice, bias, kimpAvg, kimpSlope, takePct, stopPct };
}
