/* ============================================================
   🔥 레이아웃 고정: [검색 결과] → [SPARK TOP10] → [ULTRA 시그널]
   - 기존 기능 유지 / 깜빡임·스크롤 이동 없음 (No-Motion)
   - 섹션이 리렌더되어도 순서 자동 유지
   ============================================================ */
(function () {
  function findPanel(candidates, fallbackText) {
    for (const sel of candidates) {
      const el = document.querySelector(sel);
      if (el) return el;
    }
    // 최후 수단: 제목 텍스트로 상위 컨테이너 찾기
    const h = [...document.querySelectorAll('h1,h2,h3,h4')]
      .find(x => x.textContent && x.textContent.includes(fallbackText));
    return h ? h.closest('.card, .panel, section, div') : null;
  }

  function applyNoMotion(el) {
    if (!el) return;
    el.style.transition = 'none';
    el.style.opacity = '1';
    el.style.position = 'relative';
  }

  function reorder() {
    const searchPanel = findPanel(
      ['#search-panel', '[data-section="search"]'],
      '검색 결과'
    );
    const sparkPanel = findPanel(
      ['#spark-panel', '[data-section="spark"]'],
      'SPARK TOP10'
    );
    const ultraPanel = findPanel(
      ['#ultra-panel', '[data-section="ultra"]'],
      'ULTRA 시그널'
    );

    if (!searchPanel || !sparkPanel || !ultraPanel) return;

    // No-Motion
    [searchPanel, sparkPanel, ultraPanel].forEach(applyNoMotion);

    // 목표 순서: 검색 → SPARK → ULTRA
    // 1) SPARK을 검색 바로 아래로
    if (sparkPanel.previousElementSibling !== searchPanel) {
      searchPanel.insertAdjacentElement('afterend', sparkPanel);
    }
    // 2) ULTRA를 SPARK 바로 아래로
    if (ultraPanel.previousElementSibling !== sparkPanel) {
      sparkPanel.insertAdjacentElement('afterend', ultraPanel);
    }

    // 간격
    if (!sparkPanel.dataset._gapApplied) {
      sparkPanel.style.marginTop = '12px';
      sparkPanel.dataset._gapApplied = '1';
    }
    if (!ultraPanel.dataset._gapApplied) {
      ultraPanel.style.marginTop = '12px';
      ultraPanel.dataset._gapApplied = '1';
    }
  }

  function run() {
    reorder();
    // 상위 컨테이너에서 구조가 바뀌어도 순서 유지
    const root = document.querySelector('#app') || document.body;
    const mo = new MutationObserver(() => reorder());
    mo.observe(root, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run, { once: true });
  } else {
    run();
  }
})();
