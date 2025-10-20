<!-- /strategies/loader.js -->
<script>
/**
 * 전략 선택 저장 키
 * - selectedStrategy: 'fixed' | 'volatility' | 'custom'
 * - customLevelsCode: 메모장에서 저장한 사용자 정의 코드(문자열)
 */
(function(){
  const STRATEGY_KEY = 'selectedStrategy';
  const CUSTOM_CODE_KEY = 'customLevelsCode';

  // 기본값: fixed
  const mode = (localStorage.getItem(STRATEGY_KEY) || 'fixed').toLowerCase();

  // 공용 헬퍼: 안전하게 함수 주입
  function installCalc(fn){
    if(typeof fn !== 'function'){
      console.warn('[strategies] calcTradeLevels가 함수가 아님. fixed로 폴백');
      window.calcTradeLevels = function(price, changeRate){
        return {
          buy:  Math.max(0, Math.floor(price * 0.988 * 100) / 100),
          sell: Math.floor(price * 1.012 * 100) / 100,
          stop: Math.max(0, Math.floor(price * 0.975 * 100) / 100)
        };
      };
      return;
    }
    window.calcTradeLevels = fn;
  }

  // 전략별 로드
  async function load(){
    try{
      if(mode === 'fixed'){
        const m = await import('./levels.fixed.js');
        installCalc(m.calcTradeLevels);
      }else if(mode === 'volatility'){
        const m = await import('./levels.volatility.js');
        installCalc(m.calcTradeLevels);
      }else if(mode === 'custom'){
        const code = localStorage.getItem(CUSTOM_CODE_KEY) || '';
        if(!code.trim()){
          console.warn('[strategies] customLevelsCode 비어있음 → fixed 폴백');
          const m = await import('./levels.fixed.js');
          installCalc(m.calcTradeLevels);
          return;
        }
        // 사용자 코드 실행(격리된 함수로만 허용)
        // 사용자는 반드시: function calcTradeLevels(price, changeRate){... return {buy,sell,stop}; }
        const wrapped = `(function(){ ${code}\n return (typeof calcTradeLevels==='function')? calcTradeLevels : null; })()`;
        const fn = (0, eval)(wrapped);
        installCalc(fn);
      }else{
        const m = await import('./levels.fixed.js');
        installCalc(m.calcTradeLevels);
      }
      console.log('[strategies] 적용 모드:', mode);
    }catch(e){
      console.error('[strategies] 로드 실패 → fixed 폴백', e);
      const m = await import('./levels.fixed.js');
      installCalc(m.calcTradeLevels);
    }
  }

  load();
})();
</script>
