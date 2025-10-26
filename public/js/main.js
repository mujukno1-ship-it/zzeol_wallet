async function fetchAll(){
  const sym = STATE.symbol;
  const [prem, onch] = await Promise.all([
    API.premium(sym),
    API.onchain(STATE.onchainSymbol),
  ]);

  STATE.premium = prem?.ok ? prem : null;
  STATE.onchain = onch?.ok ? onch : null;

  STATE.signal = calcIndicators(STATE.premium);
  STATE.risk   = calcRisk(STATE.premium, STATE.signal);
  STATE.talk   = makeComment(STATE.premium, STATE.onchain, STATE.signal, STATE.risk);
  STATE.updatedAt = Date.now();

  renderAll();
}

window.refreshAll = function(){
  fetchAll().catch(err=>{
    console.error(err);
    STATE.talk = "연동 오류—잠시 후 다시 시도해주세요.";
    renderAll();
  });
};

document.addEventListener("DOMContentLoaded", ()=>{
  // 첫 로드
  refreshAll();
  // 20초마다 새로고침 (워커 캐시 TTL과 맞춤)
  setInterval(refreshAll, 20_000);
});
