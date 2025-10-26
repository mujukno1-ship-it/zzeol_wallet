// ==== search.js (시작)
(function(){
  const input = document.getElementById('q');
  const clear = document.getElementById('clear');
  const MAP = window.APP_CFG.MAP;

  function guessSymbolFromKorean(q){
    q = (q||'').trim();
    if(!q) return null;
    if(/비트|btc/i.test(q)) return 'BTC';
    if(/이더|eth/i.test(q)) return 'ETH';
    if(/솔라|sol/i.test(q)) return 'SOL';
    if(/리플|xrp/i.test(q)) return 'XRP';
    return null;
  }

  function apply(q){
    let sym = (q||'').toUpperCase();
    if(!window.APP_CFG.MAP[sym]) sym = guessSymbolFromKorean(q) || 'BTC';
    window.STATE.symbol = sym;
    window.runOnce();  // main.js의 데이터 갱신
  }

  input?.addEventListener('keydown', (e)=>{
    if(e.key==='Enter'){ apply(input.value); }
  });
  clear?.addEventListener('click', ()=>{
    input.value = ''; input.focus();
  });
})();
// ==== search.js (끝)
