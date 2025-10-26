// ==== main.js (시작)
(async function(){
  const S = window.STATE;
  const CFG = window.APP_CFG;

  async function loadAll(){
    const sym = S.symbol;
    const [p, o] = await Promise.allSettled([
      API.getPremium(sym),
      API.getOnchain(sym)
    ]);
    if(p.status==='fulfilled') S.premium = p.value; else S.premium=null;
    if(o.status==='fulfilled') S.onchain = o.value; else S.onchain=null;
    S.lastUpdated = Date.now();
  }

  function paintAll(){
    const sym = S.symbol;
    RENDER.paintPremium(S.premium);
    RENDER.paintOnchain(S.onchain, sym);
    RENDER.paintSignal(S.premium);
    RENDER.paintCommentary(S.premium, S.onchain);
  }

  async function runOnce(){
    try{
      await loadAll();
      paintAll();
    }catch(e){
      console.error(e);
    }
  }

  window.runOnce = runOnce; // 검색에서 호출

  // 초기 구동
  document.getElementById('q')?.setAttribute('placeholder', '비트코인, 이더리움, 솔라나… 검색');
  S.symbol = CFG.DEFAULT_SYMBOL;
  await runOnce();

  // 30초마다 갱신
  setInterval(runOnce, 30_000);
})();
// ==== main.js (끝)
