// ==== 쩔어지갑 6.0 타점 로더 완성판 ====
// 기존 UI/기능 유지 + 새로운 기능 추가 + 오류 수정 완전 통합버전

(function () {
  const STRATEGY_KEY = 'selectedStrategy';
  const CUSTOM_CODE_KEY = 'customLevelsCode';
  const mode = (localStorage.getItem(STRATEGY_KEY) || 'fixed').toLowerCase();

  function installCalc(fn) {
    if (typeof fn !== 'function') {
      console.warn('[쩔어지갑] calcTradeLevels 함수 누락 → 기본 fixed로 전환');
      window.calcTradeLevels = (price) => ({
        buy: price * 0.988,
        sell: price * 1.012,
        stop: price * 0.975,
      });
      return;
    }
    window.calcTradeLevels = fn;
    console.log(`[쩔어지갑] ${mode} 전략 적용됨 ✅`);
  }

  async function loadStrategy() {
    try {
      if (mode === 'fixed') {
        const m = await import('./levels.fixed.js');
        installCalc(m.calcTradeLevels);
      } else if (mode === 'volatility') {
        const m = await import('./levels.volatility.js');
        installCalc(m.calcTradeLevels);
      } else if (mode === 'custom') {
        const code = localStorage.getItem(CUSTOM_CODE_KEY);
        if (!code?.trim()) {
          console.warn('[쩔어지갑] custom 코드 없음 → fixed로 전환');
          const m = await import('./levels.fixed.js');
          installCalc(m.calcTradeLevels);
          return;
        }
        const wrapped = `(function(){ ${code}\n return (typeof calcTradeLevels==='function')?calcTradeLevels:null; })()`;
        const fn = (0, eval)(wrapped);
        installCalc(fn);
      } else {
        const m = await import('./levels.fixed.js');
        installCalc(m.calcTradeLevels);
      }
    } catch (e) {
      console.error('[쩔어지갑] 전략 로드 실패 → fixed 적용', e);
      const m = await import('./levels.fixed.js');
      installCalc(m.calcTradeLevels);
    }
  }

  loadStrategy();
})();
