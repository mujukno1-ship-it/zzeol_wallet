console.log("[쩔어지갑] app.js 로드 ✅");

/************** 공통 함수 **************/
const toStr = (v) => (v == null ? "" : String(v));
const toNum = (v, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};
function getEl(id){ return document.getElementById(id); }

/************** 검색 기능 **************/
function getQuery() {
  const raw = getEl("search-input") ? getEl("search-input").value : "";
  return toStr(raw).trim().toLowerCase();
}

function renderRows(rows) {
  const tbody = getEl("search-body");
  if (!tbody) return;

  tbody.innerHTML = (rows || []).map(r => {
    const ko   = toStr(r.kr_name || r.korean || r.name_kr || r.name);
    const sym  = toStr(r.symbol || r.ticker || r.code);
    const px   = toNum(r.price_krw ?? r.price ?? r.close, 0).toLocaleString("ko-KR");
    const buy  = toNum(r.buy ?? r.entry ?? r.tp_buy, 0).toLocaleString("ko-KR");
    const sell = toNum(r.sell ?? r.tp ?? r.tp_sell, 0).toLocaleString("ko-KR");
    const sl   = toNum(r.sl ?? r.stop ?? r.stop_loss, 0).toLocaleString("ko-KR");
    const risk = toStr(r.risk ?? "");
    const preS = toStr(r.preheat_start ?? "");
    const preE = toStr(r.preheat_end ?? "");
    const cmt  = toStr(r.comment ?? "");

    return `
      <tr>
        <td>${ko}</td><td>${sym}</td><td>${px}</td>
        <td>${buy}</td><td>${sell}</td><td>${sl}</td>
        <td>${risk}</td><td>${preS}</td><td>${preE}</td><td>${cmt}</td>
      </tr>`;
  }).join("");
}

function applySearch(allRows) {
  const q = getQuery();
  if (!q) return renderRows(allRows);
  const filtered = (allRows || []).filter(r => {
    const ko = toStr(r.kr_name || r.name_kr || "").toLowerCase();
    const sym = toStr(r.symbol || "").toLowerCase();
    return ko.includes(q) || sym.includes(q);
  });
  renderRows(filtered);
}

(function wireSearch() {
  const el = getEl("search-input");
  if (!el) return;
  el.addEventListener("input", () => applySearch(window.__ALL_ROWS__ || []));
})();

function setDataAndRender(rows) {
  window.__ALL_ROWS__ = Array.isArray(rows) ? rows : [];
  applySearch(window.__ALL_ROWS__);
}

/************** 업비트 연동 **************/
const UPBIT_BASE = "https://api.upbit.com/v1";

async function fetchKRWMarkets() {
  const res = await fetch(`${UPBIT_BASE}/market/all?isDetails=true`);
  const list = await res.json();
  const krw = list.filter(x => x.market.startsWith("KRW-"));
  const nameMap = {};
  krw.forEach(x => {
    nameMap[x.market] = {
      ko: x.korean_name,
      sym: (x.market.split("-")[1] || "").toUpperCase()
    };
  });
  return { markets: krw.map(x => x.market), nameMap };
}

async function fetchTickers(markets) {
  const chunkSize = 30;
  const all = [];
  for (let i=0;i<markets.length;i+=chunkSize) {
    const url = `${UPBIT_BASE}/ticker?markets=${encodeURIComponent(markets.slice(i, i+chunkSize).join(","))}`;
    const res = await fetch(url);
    const arr = await res.json();
    all.push(...arr);
  }
  return all;
}
// === Upbit KRW tick unit (2025-07-31 변경 반영) ===
// 참고: 업비트 개발자센터 공지에 따른 가격구간별 호가단위. :contentReference[oaicite:0]{index=0}
function krwTickUnit(p) {
  const x = Number(p);
  if (!Number.isFinite(x)) return 1;

  if (x >= 2_000_000) return 1000;
  if (x >= 1_000_000) return 1000;   // 변경 후 500 -> 1000
  if (x >=   500_000) return 500;    // 변경 후 100 -> 500
  if (x >=   100_000) return 100;    // 변경 후 50 -> 100
  if (x >=    50_000) return 50;     // 신설 구간
  if (x >=    10_000) return 10;
  if (x >=     5_000) return 5;      // 신설 구간
  if (x >=     1_000) return 1;
  if (x >=       100) return 1;      // 변경 후 0.1 -> 1
  if (x >=        10) return 0.1;    // 변경 후 0.01 -> 0.1
  if (x >=         1) return 0.01;   // 변경 후 0.001 -> 0.01
  if (x >=       0.1) return 0.001;  // 변경 후 0.0001 -> 0.001
  if (x >=      0.01) return 0.0001; // 변경 후 0.00001 -> 0.0001
  if (x >=     0.001) return 0.00001;
  if (x >=    0.0001) return 0.000001;
  if (x >=   0.00001) return 0.0000001;
  return 0.00000001;
}

// dir: "round" | "floor" | "ceil"
function roundToTick(p, dir = "round") {
  const u = krwTickUnit(p);
  if (!Number.isFinite(p)) return 0;
  const v = p / u;
  if (dir === "floor") return Math.floor(v) * u;
  if (dir === "ceil")  return Math.ceil(v)  * u;
  return Math.round(v) * u;
}

// KRW 표시용 (호가단위에 맞춰 자리수 자동)
function formatKRW(p) {
  const u = krwTickUnit(p);
  const decimals = (u >= 1) ? 0 : Math.max(0, String(u).split(".")[1]?.length || 0);
  return Number(p).toLocaleString("ko-KR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function buildRows(tickers, nameMap) {
  return tickers.map(t => {
    const m = t.market;
    const n = nameMap[m] || {};
    const p = toNum(t.trade_price, 0);
    const buy = Math.round(p * 0.985);
    const sell = Math.round(p * 1.015);
    const sl = Math.round(p * 0.97);
    return {
      kr_name: n.ko || m,
      symbol: n.sym || (m.split("-")[1] || ""),
      price_krw: p, buy, sell, sl, risk:"1",
      preheat_start:"", preheat_end:"", comment:""
    };
  });
}

async function refreshOnce() {
  try {
    if (!window.__UPBIT__) {
      const { markets, nameMap } = await fetchKRWMarkets();
      window.__UPBIT__ = { markets, nameMap };
    }
    const { markets, nameMap } = window.__UPBIT__;
    const tickers = await fetchTickers(markets);
    const rows = buildRows(tickers, nameMap);
    setDataAndRender(rows);
  } catch (e) {
    console.error("업비트 오류", e);
    setDataAndRender([
      {kr_name:"에테나", symbol:"ENA", price_krw:1234, buy:1200, sell:1300, sl:1100, risk:"1", comment:"임시 표시"},
      {kr_name:"볼타", symbol:"VOLTA", price_krw:345, buy:330, sell:360, sl:300, risk:"1", comment:"임시 표시"}
    ]);
  }
}

let __poll = null;
function applyPolling() {
  if (__poll) clearInterval(__poll);
  const s = Number(getEl("polling-seconds")?.value || 5);
  __poll = setInterval(refreshOnce, s * 1000);
}

(function init() {
  getEl("refresh-btn")?.addEventListener("click", refreshOnce);
  getEl("polling-seconds")?.addEventListener("change", applyPolling);
  refreshOnce();
  applyPolling();
})();
