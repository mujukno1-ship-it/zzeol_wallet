// ====================================================================
// 쩔어지갑 v10.4 — 업비트 KRW 실시간 (REST 프록시 + 즉시표시)
// 프록시 경로: /api/upbit  (api/upbit.js 가 있어야 함)
// ====================================================================

// ------- 기본 설정 -------
const baseMarket = "KRW";
let currentCode = "KRW-SHIB";   // 초기 기본: 시바이누
let USE_REST = true;            // 초기에 REST로 바로 숫자 채움 (WS는 나중에)

// 타이머
let restTickerTimer = null;
let restOrderbookTimer = null;

// DOM 캐시
const el = {};
window.addEventListener("DOMContentLoaded", () => {
  el.ws = document.getElementById("ws-status");
  el.price = document.getElementById("price");
  el.tableBody = document.getElementById("coin-list-body");
  el.search = document.getElementById("search-input");
  el.refresh = document.getElementById("refresh-btn");
  el.name = document.getElementById("coin-name");
  el.code = document.getElementById("coin-code");

  // 이벤트
  el.refresh?.addEventListener("click", () => loadKRWMarkets());
  el.search?.addEventListener("input", () => filterTable(el.search.value));

  // 최초 로딩 루틴
  setWSStatus("초기화");
  setCoin(currentCode, "시바이누");
  startRestLoop(currentCode);
  loadKRWMarkets(); // 목록도 채움
});

// ------- 유틸 -------
function setWSStatus(txt, good = true) {
  el.ws.textContent = `상태: ${txt}`;
  el.ws.classList.toggle("ok", !!good);
  el.ws.classList.toggle("bad", !good);
}
function fmtKRW(v) {
  if (v === undefined || v === null || isNaN(v)) return "-";
  return Number(v).toLocaleString("ko-KR");
}
// 업비트 호가단위: (원화 기준)
function upbitTick(price) {
  if (price >= 2000000) return 1000;
  if (price >= 1000000) return 500;
  if (price >= 500000)  return 100;
  if (price >= 100000)  return 50;
  if (price >= 10000)   return 10;
  if (price >= 1000)    return 1;
  if (price >= 100)     return 0.1;
  if (price >= 10)      return 0.01;
  if (price >= 1)       return 0.001;
  return 0.001; // 초저가 코인
}
function alignUpbitPrice(p) {
  const t = upbitTick(p);
  return Math.round(p / t) * t;
}

// ------- REST 백엔드 (프록시 사용) -------
function clearRestLoop() {
  if (restTickerTimer) clearInterval(restTickerTimer);
  if (restOrderbookTimer) clearInterval(restOrderbookTimer);
  restTickerTimer = null;
  restOrderbookTimer = null;
}
async function restFetchTicker(code) {
  try {
    const r = await fetch(`/api/upbit?endpoint=ticker&markets=${encodeURIComponent(code)}`, { cache: "no-store" });
    if (!r.ok) throw new Error("ticker fetch failed");
    const js = await r.json();
    const t = js && js[0];
    if (!t) return;
    renderTicker(t);
  } catch (e) {
    setWSStatus("REST 오류(티커)", false);
  }
}
async function restFetchOrderbook(code) {
  try {
    const r = await fetch(`/api/upbit?endpoint=orderbook&markets=${encodeURIComponent(code)}`, { cache: "no-store" });
    if (!r.ok) throw new Error("orderbook fetch failed");
    const js = await r.json();
    const ob = js && js[0];
    if (!ob) return;
    renderOrderbook(ob);
  } catch (e) {
    setWSStatus("REST 오류(호가)", false);
  }
}
function startRestLoop(code) {
  clearRestLoop();
  setWSStatus("REST 모드: 2초/3초 갱신", true);
  // 즉시 1회
  restFetchTicker(code);
  restFetchOrderbook(code);
  // 주기
  restTickerTimer = setInterval(() => restFetchTicker(code), 2000);
  restOrderbookTimer = setInterval(() => restFetchOrderbook(code), 3000);
}

// ------- 렌더링 -------
function setCoin(code, nameKo) {
  currentCode = code;
  if (el.name) el.name.textContent = nameKo || code;
  if (el.code) el.code.textContent = code;
}
function renderTicker(t) {
  // t.trade_price, t.signed_change_rate, t.acc_trade_price_24h 등
  const aligned = alignUpbitPrice(t.trade_price);
  if (el.price) el.price.textContent = fmtKRW(aligned);
  // 목록 테이블에도 반영
  const row = document.querySelector(`tr[data-code="${t.market}"]`);
  if (row) {
    row.querySelector(".col-price").textContent = fmtKRW(aligned);
    const rate = (t.signed_change_rate * 100).toFixed(2) + "%";
    row.querySelector(".col-rate").textContent = rate;
    row.querySelector(".col-amt").textContent = fmtKRW(Math.round(t.acc_trade_price_24h)) + "원";
  }
}
function renderOrderbook(ob) {
  // 필요시: 상위 1호가를 이용해 가격 안정화
  if (!ob || !ob.orderbook_units || !ob.orderbook_units.length) return;
  const top = ob.orderbook_units[0];
  // 참고로 실제 화면에 호가표가 있다면 여기서 채우면 됨.
}

// ------- KRW 마켓 목록 로딩 & 필터 -------
let marketCache = []; // { market, korean_name, english_name }
async function loadKRWMarkets() {
  try {
    const r = await fetch(`/api/upbit?endpoint=markets&isDetails=true`, { cache: "no-store" });
    if (!r.ok) throw new Error("markets fetch failed");
    const arr = await r.json();
    marketCache = arr.filter(x => (x.market || "").startsWith(baseMarket + "-"));
    drawTable(marketCache);
  } catch (e) {
    setWSStatus("목록 로딩 오류", false);
  }
}
function filterTable(q = "") {
  const s = (q || "").trim().toLowerCase();
  const f = !s
    ? marketCache
    : marketCache.filter(x =>
        x.market.toLowerCase().includes(s) ||
        (x.korean_name || "").toLowerCase().includes(s) ||
        (x.english_name || "").toLowerCase().includes(s)
      );
  drawTable(f);
}
function drawTable(list) {
  if (!el.tableBody) return;
  el.tableBody.innerHTML = "";
  const frag = document.createDocumentFragment();

  list.forEach(x => {
    const tr = document.createElement("tr");
    tr.dataset.code = x.market;
    tr.style.cursor = "pointer";
    tr.addEventListener("click", () => {
      setCoin(x.market, x.korean_name);
      startRestLoop(x.market);
    });

    const tdSym = document.createElement("td"); tdSym.textContent = x.market.replace(/^KRW-/, "");
    const tdName = document.createElement("td"); tdName.textContent = x.korean_name || x.english_name || "-";
    const tdPrice = document.createElement("td"); tdPrice.className = "col-price"; tdPrice.textContent = "-";
    const tdRate = document.createElement("td"); tdRate.className = "col-rate"; tdRate.textContent = "-";
    const tdAmt  = document.createElement("td"); tdAmt.className  = "col-amt";  tdAmt.textContent  = "-";

    tr.appendChild(tdSym);
    tr.appendChild(tdName);
    tr.appendChild(tdPrice);
    tr.appendChild(tdRate);
    tr.appendChild(tdAmt);

    frag.appendChild(tr);
  });

  el.tableBody.appendChild(frag);

  // 목록이 갱신되면, 현재 선택코인 포함된 행을 우선 업데이트
  if (currentCode) restFetchTicker(currentCode);
}
