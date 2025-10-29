// ====== 사토시의지갑 v12 프론트 연결 스크립트 ======
// ★★★ 여기에 네 Cloudflare Worker 주소를 확인해서 넣어줘 ★★★
const API_BASE = "https://satoshi-proxy.mujukno1.workers.dev/api"; // 끝에 /api 유지

// No-Motion 모드: 불필요한 reflow 최소화 (화면 깜빡임 방지)
const dom = {
  sparkList: document.getElementById("sparkList"),
  price:     document.getElementById("price"),
  risk:      document.getElementById("risk"),
  buy1:      document.getElementById("buy1"),
  buy2:      document.getElementById("buy2"),
  tp1:       document.getElementById("tp1"),
  tp2:       document.getElementById("tp2"),
  sl:        document.getElementById("sl"),
  comment:   document.getElementById("comment"),
  refresh:   document.getElementById("refreshBtn"),
  input:     document.getElementById("searchInput"),
  searchBtn: document.getElementById("searchBtn"),
  resultBox: document.getElementById("resultBox"),
};

let MARKETS = [];             // /markets 결과 캐시
let currentMarket = null;     // 선택된 마켓 (예: KRW-SHIB)

// ------- 유틸: 업비트 KRW 호가틱 반올림 -------
function roundUpbitKRW(v) {
  // 업비트 호가단위(대표 규칙)
  const p = Number(v);
  const abs = Math.abs(p);
  let unit = 0.001;
  if (abs >= 2_000_000) unit = 1000;
  else if (abs >= 1_000_000) unit = 500;
  else if (abs >=   500_000) unit = 100;
  else if (abs >=   100_000) unit = 50;
  else if (abs >=    10_000) unit = 10;
  else if (abs >=     1_000) unit = 5;
  else if (abs >=       100) unit = 1;
  else if (abs >=        10) unit = 0.1;
  else if (abs >=         1) unit = 0.01;
  else unit = 0.001; // 저가코인
  return (Math.round(p / unit) * unit).toFixed(
    unit >= 1 ? 0 : String(unit).split(".")[1].length
  );
}

// ------- 공용 fetch -------
async function fx(path) {
  const url = `${API_BASE}${path}`;
  try {
    const res = await fetch(url, { cache: "no-store" });
    const data = await res.json();
    if (data && data.ok) return data;
    throw new Error(data?.error || `HTTP ${res.status}`);
  } catch (e) {
    console.error("[API]", path, e);
    throw e;
  }
}

// ------- 초기화: 마켓 목록 & SPARK -------
async function init() {
  // 1) 마켓 목록
  try {
    const m = await fx("/markets");
    MARKETS = m.items || [];
  } catch (e) {
    // 마켓 못 불러오면 검색/ULTRA 사용 불가 -> 안내
    dom.resultBox.textContent = "마켓 목록을 불러오지 못했습니다. API_BASE 확인!";
  }

  // 2) SPARK Top10 (없으면 대체)
  await renderSpark();
}

async function renderSpark() {
  dom.sparkList.textContent = "불러오는 중...";
  let items = [];
  let from = "spark";

  try {
    const s = await fx("/spark/top10");   // Worker에 구현된 경우
    items = s.items || [];
  } catch {
    // 예비 경로: /spark/top10 미구현 시 /markets 상위 몇 개 보여주기
    from = "fallback";
    items = (MARKETS || []).slice(0, 10).map(x => ({
      market: x.market,
      korean_name: x.korean_name,
      expected_gain: "+15~25%", // UI용 기본 라벨
      score: 0
    }));
  }

  if (!items.length) {
    dom.sparkList.textContent = "SPARK 데이터 없음.";
    return;
  }

  const frag = document.createDocumentFragment();
  items.forEach(it => {
    const row = document.createElement("div");
    row.className = "spark-item";
    row.innerHTML = `
      <div>${it.korean_name || it.market}</div>
      <div class="highlight">${it.expected_gain || `예열강도 ${it.score || 0}%`}</div>
    `;
    row.style.cursor = "pointer";
    row.onclick = () => pickMarket(it.market);
    frag.appendChild(row);
  });
  dom.sparkList.innerHTML = "";
  dom.sparkList.appendChild(frag);

  console.log(`[SPARK] source=${from} count=${items.length}`);
}

// ------- 마켓 선택 후 ULTRA 호출 -------
async function pickMarket(market) {
  currentMarket = market;
  await loadUltra();
}

async function loadUltra() {
  if (!currentMarket) return;

  // 기본 스켈레톤 표시(깜빡임 방지)
  applyUltra({ price: 0, risk: 0, buy1: 0, buy2: 0, tp1: 0, tp2: 0, sl: 0, comment: "계산 중..." });

  try {
    const data = await fx(`/ultra/signal?market=${encodeURIComponent(currentMarket)}`);
    // Worker가 스켈레톤일 수 있으니, 0 값이더라도 UI는 정상 반영
    applyUltra(data);
  } catch (e) {
    applyUltra(null, e);
  }
}

function applyUltra(data, err) {
  if (err || !data) {
    dom.price.textContent = "-";
    dom.risk.textContent  = "-";
    dom.buy1.textContent  = "-";
    dom.buy2.textContent  = "-";
    dom.tp1.textContent   = "-";
    dom.tp2.textContent   = "-";
    dom.sl.textContent    = "-";
    dom.comment.textContent = "연동 오류: 콘솔의 API_BASE와 Worker 상태를 확인해 주세요.";
    return;
  }

  // 업비트 호가틱 반올림
  const price = roundUpbitKRW(data.price || 0);
  const buy1  = roundUpbitKRW(data.buy1  || 0);
  const buy2  = roundUpbitKRW(data.buy2  || 0);
  const tp1   = roundUpbitKRW(data.tp1   || 0);
  const tp2   = roundUpbitKRW(data.tp2   || 0);
  const sl    = roundUpbitKRW(data.sl    || 0);

  dom.price.textContent = `${price}원`;
  dom.risk.textContent  = data.risk ?? "-";
  dom.buy1.textContent  = `${buy1}원`;
  dom.buy2.textContent  = `${buy2}원`;
  dom.tp1.textContent   = `${tp1}원`;
  dom.tp2.textContent   = `${tp2}원`;
  dom.sl.textContent    = `${sl}원`;
  dom.comment.textContent = data.comment || "데이터 대기중";
}

// ------- 검색 -------
function searchLocal(q) {
  if (!q || !MARKETS.length) return [];
  const s = q.trim().toLowerCase();
  return MARKETS
    .filter(x =>
      (x.korean_name && x.korean_name.toLowerCase().includes(s)) ||
      (x.english_name && x.english_name.toLowerCase().includes(s)) ||
      (x.market && x.market.toLowerCase().includes(s))
    )
    .slice(0, 5);
}

function renderSearch(items) {
  if (!items.length) {
    dom.resultBox.textContent = "검색어를 입력해 주세요.";
    return;
  }
  const frag = document.createDocumentFragment();
  items.forEach(it => {
    const wrap = document.createElement("div");
    wrap.className = "spark-item";
    wrap.innerHTML = `
      <div>${it.korean_name} <span style="color:#888;">(${it.market})</span></div>
      <div><button data-m="${it.market}">선택</button></div>
    `;
    frag.appendChild(wrap);
  });
  dom.resultBox.innerHTML = "";
  dom.resultBox.appendChild(frag);

  dom.resultBox.querySelectorAll("button[data-m]").forEach(btn => {
    btn.onclick = (e) => {
      const m = e.currentTarget.getAttribute("data-m");
      pickMarket(m);
    };
  });
}

// 이벤트 바인딩
dom.searchBtn.addEventListener("click", () => {
  const q = dom.input.value;
  const hits = searchLocal(q);
  if (!hits.length) dom.resultBox.textContent = "검색 결과 없음.";
  else renderSearch(hits);
});

dom.refresh.addEventListener("click", () => {
  if (!currentMarket) {
    dom.comment.textContent = "먼저 SPARK에서 클릭하거나 검색→선택해 주세요.";
    return;
  }
  loadUltra();
});

// 시작
init();
