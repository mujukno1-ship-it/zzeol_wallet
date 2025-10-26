// public/js/modules/commentary.js
export function makeComment({ bias, risk, kimpAvg, kimpSlope }){
  if(bias === "매수 유리" && risk <= 2){
    return "세력 예열 중. 분할로 진입 유효 👀";
  }
  if(bias === "익절/경계" && risk >= 4){
    return "과열 구간. 익절 또는 현금 보유 권장 ⚠️";
  }
  if(kimpSlope < 0 && risk >= 4){
    return "하락 압력. 손절선 꼭 지키자 🧯";
  }
  if(Math.abs(kimpAvg) < 0.3 && risk <= 2){
    return "횡보 무드. 스캘핑만 살짝 ✂️";
  }
  return "시장 눈치 보기. 손절 라인 먼저! 🛡️";
}
