/* ============================================================
   🔥 ULTRA 시그널 패널을 "검색 결과" 바로 밑으로 고정
   - 기존 기능 유지
   - No-Motion (깜빡임/스크롤 이동 없음)
   - 검색 영역이 다시 그려져도 자동으로 유지
   ============================================================ */
(function () {
  function qText(selList, text) {
    for (const sel of selList) {
      const el = document.querySelector(sel);
      if (el) return el;
    }
    // 텍스트로 찾는 최후 수단
    const h = [...document.querySelectorAll('h1,h2,h3,h4')].find(
      (x) => x.textContent && x.textContent.includes(text)
    );
    return h ? h.closest('.card, .panel, section, div') : null;
  }

  function relocateUltra() {
    // 검색 패널 찾기 (ID가 없더라도 텍스트로 백업 검색)
    const searchPanel =
      qText(['#search-panel', '[data-section="search"]'], '검색 결과');

    // ULTRA 패널 찾기
    const ultraPanel =
      qText(['#ultra-panel', '[data-section="ultra"]'], 'ULTRA 시그널');

    if (!searchPanel || !ultraPanel) return;

    // 이미 위치가 맞으면 종료
    if (ultraPanel.previousElementSibling === searchPanel) return;

    // No-Motion: 애니/트랜지션 제거
    ultraPanel.style.transition = 'none';
    ultraPanel.style.opacity = '1';
    ultraPanel.style.position = 'relative';

    // 검색 결과 바로 뒤로 이동
    searchPanel.insertAdjacentElement('afterend', ultraPanel);

    // 간격만 살짝
    if (!ultraPanel.dataset._spacingApplied) {
      ultraPanel.style.marginTop = '12px';
      ultraPanel.dataset._spacingApplied = '1';
    }
  }

  // 초기 실행 (DOM 준비 후)
  function run() {
    relocateUltra();

    // 검색 결과가 다시 렌더되어도 항상 유지
    const root = (document.querySelector('#app') || document.body);
    const mo = new MutationObserver(() => relocateUltra());
    mo.observe(root, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run, { once: true });
  } else {
    run();
  }
})();
