// 김프/변동성 구간으로 위험도 1~5
window.calcRisk = function(premium, indicators){
  if(!premium || premium.premiumPct==null) return 3;
  const k = Math.abs(premium.premiumPct);
  if(k < 1) return 1;
  if(k < 2) return 2;
  if(k < 3.5) return 3;
  if(k < 5) return 4;
  return 5;
};
