// =====================================================
// 사토시의지갑 - 김프/온체인 직결 모드 (프록시 無)
// - Upbit, CoinGecko, open.er-api, DefiLlama 직접 호출
// - 자리(id) 없으면 자동 생성
// - 10초마다 갱신 + 간단 타점(z-score) 계산
// =====================================================

// ── 유틸
async function fetchJson(u) {
  const r = await fetch(u, { headers: { Accept: "application/json" } });
  if (!r.ok) throw new Error(`HTTP ${r.status} @ ${u}`);
  return r.json();
}
const $ = (s) => document.querySelector(s);

// ── 김프 카드 자리를 자동 준비
function ensureKimchiSlots() {
  // 카드 후보
  let card =
    Array.from(document.querySelectorAll(".metric-card")).find((c) =>
      (c.textContent || "").includes("김치 프리미엄")
    ) || document.querySelectorAll(".metric-card")[0] || document.body;

  // 상단 %
  if (!document.getElementById("kimchi-premium")) {
    const top = document.createElement("div");
    top.id = "kimchi-premium";
    top.textContent = "--%";
    top.style.fontSize = "28px";
    top.style.fontWeight = "700";
    top.style.marginBottom = "8px";
    card.prepend(top);
  }

  // 리스트
  let list = card.querySelector("ul");
  if (!list) {
    list = document.createElement("ul");
    list.style.listStyle = "none";
    list.style.padding = "0";
    list.style.margin = "8px 0";
    card.appendChild(list);
  }
  const need = [
    ["upbit-krw", "업비트 KRW"],
    ["global-krw", "글로벌 KRW"],
    ["binance-usd", "글로벌 USD"],
    ["usd-krw", "USD/KRW"],
    ["signal", "시그널"],
  ];
  for (const [id, label] of need) {
    if (!document.getElementById(id)) {
      const li = document.createElement("li");
      li.innerHTML = `${label}: <span id="${id}">-</span>`;
      list.appendChild(li);
    }
  }
  if (!document.getElementById("status")) {
    const s = document.createElement("div");
    s.id = "status";
    s.textContent = "불러오는 중...";
    s.style.opacity = "0.7";
    s.style.marginTop = "4px";
    card.appendChild(s);
  }
}

// ── 온체인 카드 자리(선택) 준비
function ensureOnchainSlots() {
  let card =
    Array.from(document.querySelectorAll(".metric-card")).find((c) =>
      (c.textContent || "").includes("온체인")
    ) || document.querySelectorAll(".metric-card")[1] || document.body;

  if (!document.getElementById("onchain-tvl")) {
    const line = document.createElement("div");
    line.innerHTML = `TVL: <span id="onchain-tvl">-</span>`;
    card.appendChild(line);
  }
}

// ── z-score 기반 간단 타점(최근 30개)
const premHist = [];
function signalFromPremium(p) {
  premHist.push(p);
  if (premHist.length > 30) premHist.shift();
  const m = premHist.reduce((a, b) => a + b, 0) / premHist.length;
  const sd =
    Math.sqrt(premHist.reduce((a, b) => a + (b - m) ** 2, 0) / premHist.length) || 1;
  const z = (p - m) / sd;

  if (z <= -1.5) return "매수 진입";
  if (z <= -1.0) return "매수 관찰";
  if (z >= 1.5) return "매도 익절";
  if (z >= 1.0) return "매도 관찰";
  return "중립";
}

// ── 김프 업데이트 (10초)
async function updatePremium() {
  ensureKimchiSlots();

  const elPct = $("#kimchi-premium");
  const elUpbit = $("#upbit-krw");
  const elGlobal = $("#global-krw");
  const elUsd = $("#binance-usd");
  const elUsdKrw = $("#usd-krw");
  const elSig = $("#signal");
  const elStatus = $("#status");

  try {
    // 1) 업비트 KRW
    const up = await fetchJson("https://api.upbit.com/v1/ticker?markets=KRW-BTC");
    const upbit = Number(up?.[0]?.trade_price || 0);

    // 2) 글로벌 USD (CoinGecko)
    const cg = await fetchJson(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd"
    );
    const usd = Number(cg?.bitcoin?.usd || 0);

    // 3) 환율 USD→KRW (open.er-api)
    const fx = await fetchJson("https://open.er-api.com/v6/latest/USD");
    const usdkrw = Number(fx?.rates?.KRW || 0);

    const globalKrw = usd * usdkrw;
    const prem =
      upbit && globalKrw ? ((upbit - globalKrw) / globalKrw) * 100 : null;

    // 화면 반영
    if (prem != null) elPct.textContent = `${prem.toFixed(2)}%`;
    elUpbit.textContent = upbit ? `${Math.round(upbit).toLocaleString()} 원` : "-";
    elGlobal.textContent = globalKrw
      ? `${Math.round(globalKrw).toLocaleString()} 원`
      : "-";
    elUsd.textContent = usd ? `${usd.toLocaleString()} $` : "-";
    elUsdKrw.textContent = usdkrw ? usdkrw.toFixed(2) : "-";

    // 시그널
    if (prem != null) elSig.textContent = signalFromPremium(prem);

    // 상태 클리어
    if (prem != null) elStatus.textContent = "";
  } catch (_) {
    // 조용히 유지
  }
}

// ── 온체인(TVL) 업데이트 (60초)
async function updateOnchain() {
  ensureOnchainSlots();
  const el = $("#onchain-tvl");
  try {
    const chains = await fetchJson("https://api.llama.fi/chains");
    const eth = chains.find((c) => String(c.name).toLowerCase() === "ethereum");
    const tvl = Number(eth?.tvl || 0);
    if (tvl) el.textContent = tvl.toLocaleString("en-US");
  } catch (_) {
    // 유지
  }
}

// ── 초기 실행 & 주기 갱신
function init() {
  updatePremium();
  updateOnchain();
  setInterval(updatePremium, 10_000);  // 10초
  setInterval(updateOnchain, 60_000);  // 60초
}
window.addEventListener("load", init);
