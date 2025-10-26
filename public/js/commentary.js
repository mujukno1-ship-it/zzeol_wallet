window.makeComment = function(premium, onchain, indicators, risk){
  if(!premium) return "데이터 로딩중…";

  const k = premium.premiumPct!=null ? premium.premiumPct.toFixed(2) : "-";
  const tvl = onchain?.tvl ? Number(onchain.tvl).toLocaleString("en-US") : "-";
  const dir = premium.premiumPct>0 ? "국내가 높음" : (premium.premiumPct<0 ? "해외가 높음" : "유사");

  if(risk>=4) return `김프 ${k}% (${dir}), TVL ${tvl} USD. 변동성 큼—손절 라인 먼저! 🛡️`;
  if(risk===3) return `김프 ${k}% (${dir}), TVL ${tvl} USD. 관망 또는 분할 접근.`;
  return `김프 ${k}% (${dir}), TVL ${tvl} USD. 리스크 낮음—기회 탐색! ✅`;
};
