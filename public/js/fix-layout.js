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
