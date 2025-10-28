/* ============================================================
   사토시의지갑 레이아웃 고정 + 검색결과 초소형화 버전
   - 검색결과 최대 5개
   - 검색창과 동일한 폭
   - SPARK TOP10은 검색결과 바로 밑
   - ULTRA 시그널은 SPARK 밑
   - No-Motion / 기존기능유지
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
  function applyNoMotion(el){ if(!el)return; el.style.transition='none'; el.style.opacity='1'; el.style.position='relative'; }

  // ---------- CSS: 초소형 검색결과 + 5개 제한 ----------
  (function injectCSS(){
    const css = `
    #search-panel,[data-section="search"],
    #spark-panel,[data-section="spark"],
    #ultra-panel,[data-section="ultra"]{
      width:100%; max-width:880px; margin:10px auto; box-sizing:border-box;
    }
    /* 검색결과 패널 */
    #search-panel,[data-section="search"]{
      --gap:5px;--pad:5px;--fz:12px;--chip:10px;
      max-height:140px!important;
      border-radius:12px;
      overflow:hidden;
    }
    /* 내부리스트 */
    #search-panel .results,[data-section="search"] .results,
    #search-panel .list,[data-section="search"] .list,
    #srch-list{
      max-height:110px!important;
      overflow:auto;
      scrollbar-width:thin;
      display:grid;
      grid-template-columns:repeat(auto-fill,minmax(210px,1fr));
      gap:var(--gap);
    }
    /* 각 결과아이템 */
    #search-panel .result,[data-section="search"] .result,
    #search-panel .item,[data-section="search"] .item,
    #search-panel li,[data-section="search"] li,
    #srch-list>*{
      padding:var(--pad);
      font-size:var(--fz);
      line-height:1.2;
      min-height:32px;
      border-radius:8px;
    }
    #search-panel .name{font-weight:600;font-size:12px;}
    #search-panel .market{font-size:11px;opacity:.7;}
    #search-panel .btn,.select{transform:scale(.8);padding:3px 6px;font-size:var(--chip);}
    /* 5개 초과 숨김 */
    #search-panel .results>*:nth-child(n+6),
    [data-section="search"] .results>*:nth-child(n+6),
    #search-panel .list>*:nth-child(n+6),
    [data-section="search"] .list>*:nth-child(n+6),
    #srch-list>*:nth-child(n+6){display:none!important;}
    @media(max-width:768px){
      #search-panel,[data-section="search"],
      #spark-panel,[data-section="spark"],
      #ultra-panel,[data-section="ultra"]{max-width:96%;}
      #search-panel .results,[data-section="search"] .results,
      #search-panel .list,[data-section="search"] .list,
      #srch-list{grid-template-columns:1fr;}
    }`;
    const s=document.createElement('style');
    s.textContent=css;
    document.head.appendChild(s);
  })();

  // ---------- 순서 고정 ----------
  function reorder(){
    const searchPanel=findPanel(['#search-panel','[data-section="search"]'],'검색 결과');
    const sparkPanel=findPanel(['#spark-panel','[data-section="spark"]'],'SPARK');
    const ultraPanel=findPanel(['#ultra-panel','[data-section="ultra"]'],'ULTRA');
    if(!searchPanel||!sparkPanel||!ultraPanel)return;
    [searchPanel,sparkPanel,ultraPanel].forEach(applyNoMotion);
    if(sparkPanel.previousElementSibling!==searchPanel)
      searchPanel.insertAdjacentElement('afterend',sparkPanel);
    if(ultraPanel.previousElementSibling!==sparkPanel)
      sparkPanel.insertAdjacentElement('afterend',ultraPanel);
    sparkPanel.style.marginTop='10px';
    ultraPanel.style.marginTop='10px';
  }

  // ---------- 제목문구 정리 ----------
  function refineSearchTitle(){
    const panel=findPanel(['#search-panel','[data-section="search"]'],'검색 결과');
    if(!panel)return;
    const title=[...panel.querySelectorAll('h1,h2,h3,h4')].find(x=>x.textContent.includes('검색 결과'));
    if(title) title.textContent='검색 결과 — 업비트 KRW 전체 (최대 5개 / 고정폭)';
  }

  // ---------- 실행 ----------
  function run(){
    reorder(); refineSearchTitle();
    const root=document.querySelector('#app')||document.body;
    const mo=new MutationObserver(()=>{ reorder(); refineSearchTitle(); });
    mo.observe(root,{childList:true,subtree:true});
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',run,{once:true});
  else run();
})();
/* ===== 검색결과 박스 높이 자동 축소 ===== */
(function autoResizeSearchBox(){
  const panel = document.querySelector('#search-panel,[data-section="search"]');
  if(!panel) return;

  const resize = ()=>{
    const list = panel.querySelector('#srch-list, .results, .list, ul, ol');
    if(!list) return;
    const visible = [...list.children].filter(x=>x.style.display!=='none').length;
    const newHeight = Math.min(visible * 32 + 60, 180); // 5개 기준 최대 180px
    panel.style.maxHeight = `${newHeight}px`;
    panel.style.height = `${newHeight}px`;
    panel.style.transition = 'height 0.2s ease';
  };

  resize();
  const mo = new MutationObserver(resize);
  mo.observe(panel, {childList:true,subtree:true});
})();
/* ====== 검색결과 박스 강제 초소형(120px) + 5개 제한 + 헤더 교정 ====== */
(function forceCompactSearchBox(){
  const MAX = 5;
  const STYLE_ID = 'force-search-compact-style';

  // 1) 스타일 주입 (강제 축소)
  function injectStyle(){
    if (document.getElementById(STYLE_ID)) return;
    const css = `
    /* 패널(120px), 내부 리스트(88px) 강제 축소 */
    #search-panel{
      max-height:120px !important;
      height:120px !important;
      overflow:hidden !important;
      border-radius:12px !important;
      margin:10px auto !important;
      width:100% !important;
      max-width:880px !important;
    }
    #search-panel .results, #search-panel .list, #search-panel #srch-list, 
    #search-panel ul, #search-panel ol, #search-panel [role="list"]{
      max-height:88px !important;
      overflow:auto !important;
      display:grid !important;
      grid-template-columns:repeat(auto-fill,minmax(210px,1fr)) !important;
      gap:6px !important;
      padding:0 6px 6px 6px !important;
      box-sizing:border-box !important;
      scrollbar-width:thin;
    }
    #search-panel .result, #search-panel .item, #search-panel li{
      min-height:32px !important;
      font-size:12px !important;
      line-height:1.2 !important;
      padding:6px !important;
      border-radius:8px !important;
    }
    #search-panel .btn, #search-panel .select{ transform:scale(.85); }
    /* 6번째부터 숨김(실제 표시 5개) */
    #search-panel .results>*:nth-child(n+6),
    #search-panel .list>*:nth-child(n+6),
    #search-panel #srch-list>*:nth-child(n+6),
    #search-panel ul>*:nth-child(n+6),
    #search-panel ol>*:nth-child(n+6),
    #search-panel [role="list"]>*:nth-child(n+6){ display:none !important; }
    `;
    const s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = css;
    document.head.appendChild(s);
  }

  // 2) “검색 결과” 텍스트를 기준으로 패널을 찾아 #search-panel 부여
  function ensureSearchPanelId(){
    // 이미 있으면 OK
    let panel = document.querySelector('#search-panel');
    if (panel) return panel;

    // 제목을 찾아서 가장 가까운 카드/섹션을 패널로 지정
    const title = [...document.querySelectorAll('h1,h2,h3,h4')]
      .find(x => /검색\s*결과/i.test(x.textContent||''));
    if (!title) return null;

    panel = title.closest('.card, .panel, section, .section, .box, .container, div');
    if (panel) panel.id = 'search-panel';
    return panel;
  }

  // 3) 헤더 문구 교정(최대 5개)
  function fixHeader(panel){
    const h = [...panel.querySelectorAll('h1,h2,h3,h4')]
      .find(x => /검색\s*결과/i.test(x.textContent||''));
    if (h) h.textContent = '검색 결과 — 업비트 KRW 전체 (최대 5개)';
  }

  // 4) 리스트 실제 5개로 제한 (표시 개수 강제)
  function clampToFive(panel){
    const list = panel.querySelector('#srch-list, .results, .list, ul, ol, [role="list"]');
    if (!list) return;
    [...list.children].forEach((el, idx) => {
      el.style.display = (idx < MAX) ? '' : 'none';
    });
  }

  // 5) 실행 + 감시(동적 변경에도 유지)
  function applyAll(){
    injectStyle();
    const panel = ensureSearchPanelId();
    if (!panel) return;
    fixHeader(panel);
    clampToFive(panel);
  }

  applyAll();
  const root = document.querySelector('#app') || document.body;
  new MutationObserver(applyAll).observe(root, { childList:true, subtree:true });
})();
