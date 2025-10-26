(function(){
  const $q = document.getElementById("q");
  const $clear = document.getElementById("q-clear");

  function pickSymbol(txt){
    txt = (txt||"").trim().toUpperCase();
    if(!txt) return null;
    // 심볼로 딱 맞추기
    const hit = APP_CONFIG.SYMBOLS.find(v => v.sym === txt);
    if(hit) return hit.sym;
    // 한글명/영문명에서 찾기
    const byName = APP_CONFIG.SYMBOLS.find(v => v.name.includes(txt) || v.sym.includes(txt));
    return byName?.sym ?? null;
  }

  $q.addEventListener("keydown", (e)=>{
    if(e.key === "Enter"){
      const sym = pickSymbol($q.value) || APP_CONFIG.DEFAULT_SYMBOL;
      STATE.symbol = sym;
      window.refreshAll();  // main.js 에서 등록
    }
  });

  $clear.addEventListener("click", ()=>{
    $q.value = "";
    STATE.symbol = APP_CONFIG.DEFAULT_SYMBOL;
    window.refreshAll();
  });
})();
