/* ============================================================
   레이아웃 고정 (No-Motion):
   [검색 결과] → [SPARK TOP10 — 급등 사전 예열 감지] → [ULTRA 시그널]
   +  패널은 입력 전/후 동일 크기 유지
   ============================================================ */
(function () {
  // ---------- 유틸 ----------
  function findPanel(candidates, fallbackText) {
    for (const sel of candidates) {
      const el = document.querySelector(sel);
      if (el) return el;
    }
    const h = [...document.querySelectorAll('h1,h2,h3,h4')].find(
      (x) => x.textContent && x.textContent.includes(fallbackText)
    );
    return h ? h.closest('.card, .panel, section, div') : null;
  }
  function applyNoMotion(el){ if(!el) return; el.style.transition='none'; el.style.position='relative'; el.style.opacity='1'; }

  // ---------- CSS 주입:  동일 크기 + 내부 스크롤 + 2열 ----------
  (function injectCSS(){
    const css = `
    /* 검색 영역 폭(검색박스와 동일폭) */
    #search-panel, [data-section="search"],
    #spark-panel,  [data-section="spark"],
    #ultra-panel,  [data-section="ultra"]{
      width:100%; max-width:880px; margin:12px auto; box-sizing:border-box;
    }

    /*  패널: 입력 전/후 동일 크기 (접지 않음) */
    #search-panel, [data-section="search"]{
      --gap:8px; --pad:8px; --fz:13.5px; --chip:11px;
      max-height: ;         /* 필요시 120~300px로 조절 */
      overflow: hidden;          /* 바깥 고정 */
      border-radius: 14px;
    }
    /* 결과 리스트만 스크롤, 2열 그리드 */
    #search-panel .results, [data-section="search"] .results,
    #search-panel .list,    [data-section="search"] .list,
    #srch-list{
      max-height: 210px;
      overflow: auto;
      scrollbar-width: thin;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
      gap: var(--gap);
    }
    /* 아이템 크기 축소 */
    #search-panel .result, [data-section="search"] .result,
    #search-panel .item,   [data-section="search"] .item,
    #search-panel li,      [data-section="search"] li,
    #srch-list > *{
      padding: var(--pad);
      font-size: var(--fz);
      line-height: 1.25;
      min-height: 46px;
      border-radius: 10px;
    }
    /* 이름/마켓/버튼 축소 */
    #search-panel .name{ font-weight:600; font-size:13.5px; }
    #search-panel .market{ font-size:12px; opacity:.75; }
    #search-panel .btn, .select{ transform:scale(.9); padding:4px 8px; font-size:var(--chip); }

    /* 반응형 */
    @media (max-width:768px){
      #search-panel, [data-section="search"],
      #spark-panel,  [data-section="spark"],
      #ultra-panel,  [data-section="ultra"]{ max-width:96%; }
      #search-panel .results, [data-section="search"] .results,
      #search-panel .list,    [data-section="search"] .list,
      #srch-list{ grid-template-columns: 1fr; }
    }`;
    const style = document.createElement('style');
    style.setAttribute('data-layout-fix','');
    style.textContent = css;
    document.head.appendChild(style);
  })();

  // ---------- 순서 고정: 검색 → SPARK → ULTRA ----------
  function reorder(){
    const searchPanel = findPanel(['#search-panel','[data-section="search"]'], '검색 결과');
    const sparkPanel  = findPanel(['#spark-panel','[data-section="spark"]'], 'SPARK TOP10');
    const ultraPanel  = findPanel(['#ultra-panel','[data-section="ultra"]'], 'ULTRA 시그널');

    if(!searchPanel || !sparkPanel || !ultraPanel) return;

    [searchPanel, sparkPanel, ultraPanel].forEach(applyNoMotion);

    // SPARK을 "검색 결과" 바로 아래로
    if (sparkPanel.previousElementSibling !== searchPanel) {
      searchPanel.insertAdjacentElement('afterend', sparkPanel);
    }
    // ULTRA를 SPARK 바로 아래로
    if (ultraPanel.previousElementSibling !== sparkPanel) {
      sparkPanel.insertAdjacentElement('afterend', ultraPanel);
    }

    // 간격
    if(!sparkPanel.dataset._gap){ sparkPanel.style.marginTop='12px'; sparkPanel.dataset._gap='1'; }
    if(!ultraPanel.dataset._gap){ ultraPanel.style.marginTop='12px'; ultraPanel.dataset._gap='1'; }
  }

  // ----------  제목 문구 정리(옵션): 헷갈림 방지 ----------
  function refineSearchTitle(){
    const panel = findPanel(['#search-panel','[data-section="search"]'], '검색 결과');
    if(!panel) return;
    const titleEl = [...panel.querySelectorAll('h1,h2,h3,h4')].find(x => x.textContent.includes('검색 결과'));
    if (titleEl) titleEl.textContent = '검색 결과 — 업비트 KRW 전체 (최대 20개 / 입력 전·후 동일 크기)';
  }

  function run(){
    reorder();
    refineSearchTitle();
    // 구조 변경되어도 계속 유지
    const root = document.querySelector('#app') || document.body;
    const mo = new MutationObserver(()=>{ reorder(); refineSearchTitle(); });
    mo.observe(root, { childList:true, subtree:true });
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded', run, { once:true });
  }else{
    run();
  }
})();
/* ===== 검색결과 최대 5개만 표시 ===== */
(function limitSearchResults(){
  const css = `
  /* 검색 리스트는 그대로 두되, 6번째 이후는 숨김 */
  #search-panel .results > *:nth-child(n+6),
  [data-section="search"] .results > *:nth-child(n+6),
  #search-panel .list > *:nth-child(n+6),
  [data-section="search"] .list > *:nth-child(n+6),
  #srch-list > *:nth-child(n+6) {
    display: none !important;
  }`;

  const style = document.createElement('style');
  style.setAttribute('data-limit-5','');
  style.textContent = css;
  document.head.appendChild(style);
})();
/* ===== 검색결과 초(超)컴팩트 모드 — 더 작게 ===== */
(function shrinkSearchMore(){
  const css = `
  /* 패널 자체 크기 더 축소 */
  #search-panel, [data-section="search"]{
    --gap:6px; --pad:6px; --fz:12px; --chip:10px;
    max-height: 160px !important;   /* ↓ 260 → 160 */
    border-radius: 12px;
    overflow: hidden;
  }
  /* 리스트 영역만 스크롤 */
  #search-panel .results, [data-section="search"] .results,
  #search-panel .list,    [data-section="search"] .list,
  #srch-list{
    max-height: 120px !important;   /* ↓ 210 → 120 */
    overflow: auto;
    scrollbar-width: thin;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); /* 더 좁게 */
    gap: var(--gap);
  }
  /* 각 아이템 더 작게 */
  #search-panel .result, [data-section="search"] .result,
  #search-panel .item,   [data-section="search"] .item,
  #search-panel li,      [data-section="search"] li,
  #srch-list > *{
    padding: var(--pad);
    font-size: var(--fz);
    line-height: 1.2;
    min-height: 36px;               /* ↓ 46 → 36 */
    border-radius: 8px;
  }
  /* 텍스트/버튼 축소 */
  #search-panel .name{ font-weight:600; font-size:12.5px; }
  #search-panel .market{ font-size:11px; opacity:.7; }
  #search-panel .btn, .select{
    transform: scale(.8);
    padding: 3px 6px;
    font-size: var(--chip);
  }
  /* 제목·헤더 여백도 축소 */
  #search-panel .header{ margin-bottom: 4px; }
  @media (max-width:768px){
    #search-panel, [data-section="search"]{ max-width:96%; }
    #search-panel .results, [data-section="search"] .results,
    #search-panel .list,    [data-section="search"] .list,
    #srch-list{ grid-template-columns: 1fr; }
  }`;
  const s=document.createElement('style');
  s.setAttribute('data-compact-super','');
  s.textContent=css;
  document.head.appendChild(s);
})();
