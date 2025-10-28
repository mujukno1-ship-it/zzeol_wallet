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
/* ===== 검색 결과 문구/접힘 상태 개선 (No-Motion) ===== */
(function improveSearchPanelUX() {
  // 1) 요소 찾기 (ID가 없어도 제목 텍스트로 백업 탐지)
  function findPanel() {
    const byId = document.querySelector('#search-panel, [data-section="search"]');
    if (byId) return byId;
    const h = [...document.querySelectorAll('h1,h2,h3,h4')]
      .find(x => x.textContent && x.textContent.includes('검색 결과'));
    return h ? h.closest('.card, .panel, section, div') : null;
  }
  function findSearchInput() {
    return document.querySelector('#search-input, input[type="search"], [data-role="search"] input, input[placeholder*="검색"]');
  }

  const panel = findPanel();
  const input = findSearchInput();
  if (!panel || !input) return;

  // 2) 제목 문구 더 명확하게 변경
  const titleEl = [...panel.querySelectorAll('h1,h2,h3,h4')]
    .find(x => x.textContent.includes('검색 결과'));
  if (titleEl) {
    titleEl.textContent = '검색 결과 — 입력하면 자동 표시 (업비트 KRW 전체 · 최대 20개)';
  }

  // 3) 입력 전엔 패널을 얇게 접고(높이 고정), 입력하면 자동 펼침 (No-Motion)
  const APPLY = () => {
    const hasText = (input.value || '').trim().length > 0;
    if (hasText) {
      panel.style.maxHeight = '';
      panel.style.overflow  = '';
      panel.style.minHeight = ''; // 완전 펼침
    } else {
      panel.style.transition = 'none';  // 깜빡임 방지
      panel.style.maxHeight = '72px';   // 얇게 보여주기 (제목만 보임)
      panel.style.minHeight = '72px';
      panel.style.overflow  = 'hidden'; // 리스트/내용 감춤
    }
  };

  // 최초 1회 & 입력 이벤트에 반응
  APPLY();
  input.addEventListener('input', APPLY);
})();
/* ===== 검색창 확대 + 결과패널 동일폭 정렬 (No-Motion 유지) ===== */
(function enlargeSearchBox() {
  const css = `
  /* 검색창 영역 크기 확장 */
  #search-bar, [data-role="search-bar"], .search-container {
    width: 100%;
    max-width: 880px;   /* 폭 확장 (기존 600~700px에서 확대) */
    margin: 0 auto;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  /* 검색 입력창 자체 크기 확대 */
  #search-input, [data-role="search-input"], .search-input {
    width: 100%;
    height: 48px;       /* 기존보다 높이 ↑ */
    font-size: 17px;
    border-radius: 12px;
    padding: 0 18px;
    box-sizing: border-box;
  }

  /* 검색버튼 크기 조정 */
  #search-button, .search-button {
    height: 48px;
    font-size: 16px;
    border-radius: 12px;
    padding: 0 20px;
    margin-left: 6px;
  }

  /* 검색결과 패널 폭을 검색창과 동일하게 맞춤 */
  #search-panel, [data-section="search"] {
    width: 100%;
    max-width: 880px;   /* 검색창과 동일폭 */
    margin: 12px auto;
    border-radius: 14px;
    box-sizing: border-box;
  }

  /* 내부 카드/리스트 컴팩트 유지 */
  #search-panel .result, [data-section="search"] .result {
    font-size: 13.5px;
    padding: 8px 10px;
    border-radius: 10px;
  }

  /* 반응형: 모바일일 때 살짝 줄이기 */
  @media (max-width: 768px) {
    #search-bar, [data-role="search-bar"], .search-container,
    #search-panel, [data-section="search"] {
      max-width: 96%;
    }
    #search-input, .search-input {
      height: 44px;
      font-size: 15px;
    }
  }`;
  const style = document.createElement('style');
  style.setAttribute('data-search-resize','');
  style.textContent = css;
  document.head.appendChild(style);
})();
