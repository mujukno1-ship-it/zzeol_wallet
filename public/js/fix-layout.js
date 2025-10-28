/* ====== 검색결과 박스 강제 초소형 버전 (쩔다 전용 확정판) ====== */
(function forceSearchBoxMini() {
  const MAX = 5;

  function injectStyle() {
    const css = `
    /* 🔹 검색결과 영역 강제 축소 */
    #search-panel, [data-section="search"], .search-panel {
      height: 110px !important;
      max-height: 110px !important;
      min-height: 80px !important;
      overflow: hidden !important;
      background: #0d0f13 !important;
      border: 1px solid #20242a !important;
      border-radius: 12px !important;
      box-shadow: inset 0 0 6px rgba(0,0,0,0.6) !important;
      transition: height 0.15s ease-in-out;
    }
    /* 🔹 결과 리스트 */
    #search-panel ul, #search-panel ol, .results, #srch-list, .search-results {
      max-height: 70px !important;
      overflow-y: auto !important;
      padding: 0 10px !important;
      margin: 0 !important;
      display: grid !important;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)) !important;
      gap: 4px !important;
    }
    #search-panel li, #search-panel .item, .results .result {
      display: flex !important;
      justify-content: space-between !important;
      align-items: center !important;
      font-size: 12px !important;
      line-height: 1.2 !important;
      padding: 5px 8px !important;
      background: #15181d !important;
      border-radius: 8px !important;
      color: #ccc !important;
    }
    #search-panel li:nth-child(n+6),
    #search-panel .item:nth-child(n+6),
    .results .result:nth-child(n+6) {
      display: none !important;
    }
    /* 🔹 헤더 문구 교정 */
    #search-panel h2, [data-section="search"] h2 {
      font-size: 14px !important;
      font-weight: 600 !important;
      color: #aaa !important;
    }
    `;
    const style = document.createElement("style");
    style.id = "search-box-mini-style";
    style.textContent = css;
    document.head.appendChild(style);
  }

  function applyFix() {
    const title = [...document.querySelectorAll("h1,h2,h3")]
      .find(el => /검색\s*결과/.test(el.textContent || ""));
    if (!title) return;

    let panel = title.closest(".card, .panel, section, div");
    if (!panel) return;
    panel.id = "search-panel";

    const list = panel.querySelector("ul,ol,.results,#srch-list");
    if (list) {
      [...list.children].forEach((el, i) => {
        el.style.display = i < MAX ? "" : "none";
      });
    }

    const header = [...panel.querySelectorAll("h1,h2,h3")].find(el =>
      /검색\s*결과/.test(el.textContent || "")
    );
    if (header) header.textContent = "검색 결과 — 업비트 KRW 전체 (최대 5개)";
  }

  function init() {
    injectStyle();
    applyFix();
    const mo = new MutationObserver(applyFix);
    mo.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", init);
  else init();
})();
