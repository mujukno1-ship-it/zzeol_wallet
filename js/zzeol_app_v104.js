// ====================================================================
// 쩔어지갑 v10.4 — 업비트 KRW 실시간 (REST 폴백 우선)
// API 라우트 규칙: /api/ticker?ms=KRW-SHIB , /api/markets?isDetails=true
// ====================================================================

// ------- 기본 -------
const baseMarket = "KRW";
let currentCode = "KRW-SHIB";
let restTickerTimer = null;
let restOrderbookTimer = null;

const el = {};
window.addEventListener("DOMContentLoaded", () => {
  el.ws = document.getElementById("ws-status");
  el.price = document.getElementById("price");
  el.tableBody = document.getElementById("coin-list-body");
  el.search = document.getElementById("search-input");
  el.refresh = document.getElementById("refresh-btn");
  el.name = document.getElementById("coin-name");
  el.code = document.getElementById("coin-code");

  el.refresh?.addEventListener("click", () => loadKRWMarkets());
  el.search?.addEventListener("input", () => filterTable(el.search.value));

  setWSStatus("초기화");
  setCoin(currentCode, "시바이누");
  startRestLoop(currentCode);
  loadKRWMarkets();
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
// 업비트 호가단위 근사
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
  return 0.001;
}
function alignUpbitPrice(p) {
  const t = upbitTick(p);
  return Math.round(p / t) * t;
}

// ------- REST 루프 -------
function clearRestLoop() {
  if (restTickerTimer) clearInterval(restTickerTimer);
  if (restOrderbookTimer) clearInterval(restOrderbookTimer);
  restTickerTimer = restOrderbookTimer = null;
}
async function restFetchTicker(code) {
  try {
    const r = await fetch(`/api/ticker?ms=${encodeURIComponent(code)}`, { cache: "no-store" });
    if (!r.ok) throw new Error("ticker fetch failed");
    const js = await r.json();
    const t = Array.isArray(js) ? js[0] : js?.result?.[0] || js; // 라우트 형태 유연 처리
    if (!t) return;
    renderTicker(t);
  } catch (e) {
    setWSStatus("REST 오류(티커)", false);
  }
}
async function restFetchOrderbook(_code) {
  // 필요 시 구현: /api/orderbook 라우트 추가 후 사용
}
function startRestLoop(code) {
  clearRestLoop();
  setWSStatus("REST 모드: 2초/3초 갱신", true);
  restFetchTicker(code);
  restTickerTimer = setInterval(() => restFetchTicker(code), 2000);
}

// ------- 렌더 -------
function setCoin(code, nameKo) {
  currentCode = code;
  if (el.name) el.name.textContent = nameKo || code;
  if (el.code) el.code.textContent = code;
}
function renderTicker(t) {
  const aligned = alignUpbitPrice(Number(t.trade_price));
  if (el.price) el.price.textContent = fmtKRW(aligned);

  const row = document.querySelector(`tr[data-code="${t.market}"]`);
  if (row) {
    row.querySelector(".col-price").textContent = fmtKRW(aligned);
    const rate = ((t.signed_change_rate ?? t.change_rate) * 100).toFixed(2) + "%";
    row.querySelector(".col-rate").textContent = rate;
    const amt = t.acc_trade_price_24h ?? t.acc_trade_price ?? 0;
    row.querySelector(".col-amt").textContent = fmtKRW(Math.round(amt)) + "원";
  }
}

// ------- 마켓 목록 -------
let marketCache = [];
async function loadKRWMarkets() {
  try {
    const r = await fetch(`/api/markets?isDetails=true`, { cache: "no-store" });
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
  if (currentCode) restFetchTicker(currentCode);
}
