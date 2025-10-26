/* =========================
 * search.js  (자동완성 + 라우팅)
 * 붙여넣기 전체본
 * ========================= */
(function () {
  // ---- 후보 심볼 목록 (원하면 더 추가 가능) ----
  const CANDS = [
    { symbol: "BTC", name: "비트코인",  markets: ["KRW","USDT"] },
    { symbol: "ETH", name: "이더리움",  markets: ["KRW","USDT"] },
    { symbol: "XRP", name: "리플",     markets: ["KRW","USDT"] },
    { symbol: "SOL", name: "솔라나",   markets: ["KRW","USDT"] },
    { symbol: "ADA", name: "에이다",   markets: ["KRW","USDT"] },
    { symbol: "DOGE",name: "도지코인", markets: ["KRW","USDT"] },
    { symbol: "AVAX",name: "아발란체", markets: ["USDT"] },
    { symbol: "DOT", name: "폴카닷",   markets: ["USDT"] },
    { symbol: "LINK",name: "체인링크", markets: ["USDT"] },
  ];

  // ---- 엘리먼트 참조 ----
  const $input = document.getElementById("search-input");
  const $clear = document.getElementById("search-clear");

  // 자동완성 컨테이너 생성(없으면)
  let $ac = document.querySelector(".autocomplete");
  if (!$ac) {
    $ac = document.createElement("div");
    $ac.className = "autocomplete";
    // search-wrap 안에 넣기
    const wrap = document.querySelector(".search-wrap");
    wrap.appendChild($ac);
  }

  // -------- 유틸 --------
  const norm = (s) => (s || "").toString().trim().toLowerCase();

  function filterCands(q) {
    const n = norm(q);
    if (!n) return [];
    return CANDS.filter(c =>
      norm(c.symbol).includes(n) || norm(c.name).includes(n)
    ).slice(0, 20);
  }

  function renderList(list) {
    if (!list.length) {
      $ac.innerHTML = "";
      $ac.style.display = "none";
      return;
    }
    $ac.innerHTML = list.map(c => `
      <div class="item" data-symbol="${c.symbol}">
        <span class="sym">${c.symbol}</span>
        <span class="name">${c.name}</span>
        <span class="mkt">${c.markets.join(", ")}</span>
      </div>
    `).join("");
    $ac.style.display = "block";
  }

  // 선택 시, 심볼 적용 → 앱 새로고침 트리거
  function chooseSymbol(sym) {
    if (!sym) return;
    // 입력창 채우기
    const cand = CANDS.find(c => c.symbol === sym);
    if (cand) $input.value = cand.name;

    // 심볼 저장(앱이 읽을 수 있도록)
    try {
      localStorage.setItem("selected_symbol", sym);
    } catch (e) {}

    // 앱 측에 전달(여러 방식 대응)
    if (window.APP && typeof window.APP.setSymbol === "function") {
      window.APP.setSymbol(sym);
    } else if (window.APP && typeof window.APP.refresh === "function") {
      window.APP.refresh(sym);
    } else {
      // 쿼리스트링으로도 반영 (메인 진입코드가 읽어갈 수 있게)
      const url = new URL(window.location.href);
      url.searchParams.set("symbol", sym);
      window.history.replaceState(null, "", url.toString());
      // 화면 즉시 업데이트가 없다면 강제 새로고침
      // location.reload(); // 필요시 주석 해제
      document.dispatchEvent(new CustomEvent("symbol:change", { detail: sym }));
    }

    hideList();
  }

  function hideList() {
    $ac.style.display = "none";
    $ac.innerHTML = "";
  }

  // -------- 이벤트 바인딩 --------
  let t;
  $input.addEventListener("input", (e) => {
    const v = e.target.value;
    clearTimeout(t);
    t = setTimeout(() => {
      const list = filterCands(v);
      renderList(list);
    }, 120);
  });

  $input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      // 엔터 시: 첫 번째 후보 있으면 선택
      const first = $ac.querySelector(".item");
      if (first) chooseSymbol(first.dataset.symbol);
      else hideList();
    } else if (e.key === "Escape") {
      hideList();
    }
  });

  $ac.addEventListener("click", (e) => {
    const item = e.target.closest(".item");
    if (!item) return;
    chooseSymbol(item.dataset.symbol);
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".search-wrap")) hideList();
  });

  $clear.addEventListener("click", () => {
    $input.value = "";
    hideList();
    $input.focus();
  });

  // 진입 시, 기존 선택 심볼 표시
  (function initFromQueryOrLocal() {
    const url = new URL(window.location.href);
    const qSym = url.searchParams.get("symbol");
    const saved = localStorage.getItem("selected_symbol");
    const sym = (qSym || saved || "BTC").toUpperCase();
    const cand = CANDS.find(c => c.symbol === sym);
    if (cand) $input.value = cand.name;
  })();
})();
