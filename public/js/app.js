/* =========================================================
   사토시의지갑 v12 — 프론트엔드 (No-Motion, KRW 기준)
   한방 붙여넣기 버전 / 기존기능유지 + 새로운기능추가 + 오류수정
   ========================================================= */

// ✅ 여기만 바꾸면 백엔드 주소 전환 가능
const API_BASE = "https://satoshi-proxy.mujukno1.workers.dev/api";

// ------- 유틸 -------
const $ = (sel) => document.querySelector(sel);
const fmt = (n) => {
  if (n === null || n === undefined) return "-";
  const v = Number(n);
  if (Number.isNaN(v)) return n;
  return v.toLocaleString("ko-KR") + "원";
};
const text = (el, v) => (el.textContent = v);

// ------- DOM 캐시 -------
const elSpark = $("#spark");
const elSparkEmpty = $("#sparkEmpty");
const elResults = $("#results");
const elResEmpty = $("#resEmpty");
const elQ = $("#q");
const elBtnSearch = $("#btnSearch");

const elUltraMarket = $("#ultraMarket");
const elNow = $("#now");
const elRisk = $("#risk");
const elBuy1 = $("#buy1");
const elBuy2 = $("#buy2");
const elTp1 = $("#tp1");
const elTp2 = $("#tp2");
const elSl = $("#sl");
const elMent = $("#ment");

// ------- 데이터 로더 -------
async function api(path, params) {
  const url = new URL(API_BASE + path);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const j = await r.json();
  if (j && j.ok === false) throw new Error(j.error || "api failed");
  return j;
}

// SPARK TOP10 (백엔드에 없을 경우 빈 리스트 처리)
async function loadSpark() {
  try {
    const j = await api("/spark/top10"); // { ok:true, items:[{korean_name, market, price, score? ...}] }
    const items = j.items || [];
    renderSpark(items);
  } catch (e) {
    // 백엔드가 아직 미구현이어도 화면은 유지
    renderSpark([]);
  }
}

// 업비트 KRW 마켓 전체 (검색용)
async function loadMarkets() {
  const j = await api("/upbit/markets"); // { ok:true, items:[{market:"KRW-XXX", korean_name, english_name}] }
  return j.items || [];
}

// 단일 코인 ULTRA 시그널
async function loadUltra(market) {
  const j = await api("/ultra/signal", { market }); // { ok:true, market, price, risk, buy1,buy2, tp1,tp2, sl, comment }
  return j;
}

// ------- 렌더링 -------
function renderSpark(items) {
  elSpark.innerHTML = "";
  if (!items.length) {
    elSparkEmpty.style.display = "block";
    return;
  }
  elSparkEmpty.style.display = "none";

  for (const it of items) {
    const row = document.createElement("div");
    row.className = "spark-item";

    const left = document.createElement("div");
    left.innerHTML = `<div style="font-weight:700">${it.korean_name || it.market}</div>
      <div class="weak" style="margin-top:2px">${it.market} · 예열강도 ${it.score ?? "-"}%</div>`;

    const right = document.createElement("div");
    const btn = document.createElement("button");
    btn.className = "btn";
    btn.textContent = "선택";
    btn.onclick = () => selectMarket(it.market, it.korean_name);
    right.appendChild(btn);

    row.appendChild(left);
    row.appendChild(right);
    elSpark.appendChild(row);
  }
}

function renderResults(items) {
  elResults.innerHTML = "";
  if (!items.length) {
    elResEmpty.textContent = "검색 결과 없음.";
    elResEmpty.style.display = "block";
    return;
  }
  elResEmpty.style.display = "none";

  for (const it of items.slice(0, 5)) {
    const row = document.createElement("div");
    row.className = "result-item";

    const left = document.createElement("div");
    left.innerHTML = `<div style="font-weight:700">${it.korean_name}</div>
      <div class="weak" style="margin-top:2px">${it.market} · ${it.english_name}</div>`;

    const right = document.createElement("div");
    const btn = document.createElement("button");
    btn.className = "btn";
    btn.textContent = "선택";
    btn.onclick = () => selectMarket(it.market, it.korean_name);
    right.appendChild(btn);

    row.appendChild(left);
    row.appendChild(right);
    elResults.appendChild(row);
  }
}

function renderUltra(sig, nameText) {
  text(elUltraMarket, `${nameText || sig.market} (${sig.market})`);
  text(elNow, fmt(sig.price));
  text(elRisk, String(sig.risk ?? "-"));
  text(elBuy1, fmt(sig.buy1));
  text(elBuy2, fmt(sig.buy2));
  text(elTp1, fmt(sig.tp1));
  text(elTp2, fmt(sig.tp2));
  text(elSl, fmt(sig.sl));
  text(elMent, sig.comment || "-");
}

// ------- 동작 -------
let ALL_MARKETS = [];

async function bootstrap() {
  // SPARK
  loadSpark();

  // 마켓 목록 선로딩
  try {
    ALL_MARKETS = await loadMarkets();
  } catch (e) {
    ALL_MARKETS = [];
  }

  // 검색 이벤트
  elBtnSearch.addEventListener("click", doSearch);
  elQ.addEventListener("keydown", (e) => {
    if (e.key === "Enter") doSearch();
  });

  // 첫 화면은 빈 결과 표시
  renderResults([]);
}

function doSearch() {
  const q = (elQ.value || "").trim();
  if (!q) {
    renderResults([]);
    return;
  }
  const norm = q.toLowerCase();
  const hits = (ALL_MARKETS || []).filter((x) => {
    return (
      (x.korean_name && x.korean_name.toLowerCase().includes(norm)) ||
      (x.english_name && x.english_name.toLowerCase().includes(norm)) ||
      (x.market && x.market.toLowerCase().includes(norm))
    );
  });
  renderResults(hits);
}

async function selectMarket(market, nameText) {
  // ULTRA 시그널 불러와 표시
  try {
    const sig = await loadUltra(market);
    renderUltra(sig, nameText);
    // 검색 결과 패널 상단으로 스크롤 이동 없이 유지 (No-Motion)
  } catch (e) {
    renderUltra(
      { market, price: 0, risk: "-", buy1: 0, buy2: 0, tp1: 0, tp2: 0, sl: 0, comment: "연동 실패" },
      nameText
    );
  }
}

bootstrap();
