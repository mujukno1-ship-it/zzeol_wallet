// ===============================
// 사토시의지갑 - 업비트 김프 + 온체인 (자동 자리 생성 버전)
// ===============================

const API_BASE = "https://satoshi-proxy.mujukno1.workers.dev/api";

// ─────────────────────────────────────────────
// [A] 김프 카드에 표시 슬롯이 없으면 자동으로 만들어줌
// ─────────────────────────────────────────────
function ensureKimchiSlots() {
  // "김치 프리미엄" 카드 DOM을 추정해서 찾기(첫 번째 카드로 폴백)
  let card =
    Array.from(document.querySelectorAll(".metric-card")).find((c) =>
      (c.textContent || "").includes("김치 프리미엄")
    ) || document.querySelectorAll(".metric-card")[0] || document.body;

  // 상단 % 자리
  if (!document.getElementById("kimchi-premium")) {
    const top = document.createElement("div");
    top.id = "kimchi-premium";
    top.textContent = "--%";
    top.style.fontSize = "28px";
    top.style.fontWeight = "700";
    top.style.marginBottom = "8px";
    card.prepend(top);
  }

  // 리스트 컨테이너 확보
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
    ["binance-usd", "Binance(USD)"], // USD 표기도 추가
    ["usd-krw", "USD/KRW"],
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

// ─────────────────────────────────────────────
// [B] 김치 프리미엄 불러오기
// ─────────────────────────────────────────────
async function loadKimchi(symbol = "BTC") {
  ensureKimchiSlots();

  const elPct = document.getElementById("kimchi-premium");
  const elUpbit = document.getElementById("upbit-krw");
  const elGlobal = document.getElementById("global-krw");
  const elUsd = document.getElementById("binance-usd");
  const elUsdKrw = document.getElementById("usd-krw");
  const elStatus = document.getElementById("status");

  try {
    const r = await fetch(`${API_BASE}/premium?symbol=${symbol}`);
    const j = await r.json();

    // 디버깅이 필요하면 아래 한 줄을 잠깐 켜세요
    // console.log("premium resp:", j);

    if (!j.ok || typeof j.premiumPct !== "number") throw new Error("no data");

    elPct.textContent = `${j.premiumPct.toFixed(2)}%`;
    elUpbit.textContent = `${Number(j.upbitPrice).toLocaleString()} 원`;
    elGlobal.textContent = `${Math.round(j.globalKrw).toLocaleString()} 원`;
    elUsd.textContent = `${Number(j.globalUsd).toLocaleString()} $`;
    elUsdKrw.textContent = `${Number(j.usdkrw).toFixed(2)}`;

    elStatus.textContent = ""; // “불러오는 중…” 제거
  } catch (e) {
    elPct.textContent = "--%";
    elUpbit.textContent = "-";
    elGlobal.textContent = "-";
    elUsd.textContent = "-";
    elUsdKrw.textContent = "-";
    elStatus.textContent = "오류";
  }
}

// ─────────────────────────────────────────────
// [C] 온체인 TVL
// ─────────────────────────────────────────────
async function loadOnchain(symbol = "ETH") {
  // 온체인 카드 쪽은 기존 자리(id)가 있다고 가정 (없어도 그냥 - 표시)
  const tvlEl = document.querySelector("#onchain-tvl");
  const addrEl = document.querySelector("#onchain-active");
  try {
    const r = await fetch(`${API_BASE}/onchain?symbol=${symbol}`);
    const j = await r.json();
    if (!j.ok) throw new Error("onchain");

    if (tvlEl) tvlEl.textContent = Number(j.tvl || 0).toLocaleString("en-US");
    if (addrEl) addrEl.textContent = "-";
  } catch {
    if (tvlEl) tvlEl.textContent = "-";
    if (addrEl) addrEl.textContent = "-";
  }
}

// ─────────────────────────────────────────────
// [D] 초기 실행 + 자동 갱신 (깜빡임 최소화)
// ─────────────────────────────────────────────
function init() {
  loadKimchi();
  loadOnchain();
  setInterval(loadKimchi, 10000);  // 10초
  setInterval(loadOnchain, 60000); // 1분
}

window.addEventListener("load", init);
