// =====================================================
// 사토시의지갑 - 프론트 최종본 (Worker 전용)
// - 오직 두 엔드포인트만 사용:
//   1) /api/premium?symbol=BTC
//   2) /api/onchain?symbol=ETH
// - 기존 /api/upbit, /api/kimchi, data.map 등 전부 미사용
// =====================================================

const API_BASE = "https://satoshi-proxy.mujukno1.workers.dev/api";

// DOM 헬퍼
const $ = (s) => document.querySelector(s);

// 표시 자리 보장 (없으면 자동 생성)
function ensureSlots() {
  // 김프 카드
  let kimchiCard =
    Array.from(document.querySelectorAll(".metric-card")).find((c) =>
      (c.textContent || "").includes("김치 프리미엄")
    ) || document.querySelectorAll(".metric-card")[0] || document.body;

  if (!$("#kimchi-premium")) {
    const top = document.createElement("div");
    top.id = "kimchi-premium";
    top.textContent = "--%";
    top.style.fontSize = "28px";
    top.style.fontWeight = "700";
    top.style.marginBottom = "8px";
    kimchiCard.prepend(top);
  }

  let list = kimchiCard.querySelector("ul");
  if (!list) {
    list = document.createElement("ul");
    list.style.listStyle = "none";
    list.style.padding = "0";
    list.style.margin = "8px 0";
    kimchiCard.appendChild(list);
  }

  const need = [
    ["upbit-krw", "업비트 KRW"],
    ["global-krw", "글로벌 KRW"],
    ["usd-krw", "USD/KRW"],
  ];
  for (const [id, label] of need) {
    if (!document.getElementById(id)) {
      const li = document.createElement("li");
      li.innerHTML = `${label}: <span id="${id}">-</span>`;
      list.appendChild(li);
    }
  }

  if (!$("#status")) {
    const s = document.createElement("div");
    s.id = "status";
    s.textContent = "불러오는 중...";
    s.style.opacity = "0.7";
    s.style.marginTop = "4px";
    kimchiCard.appendChild(s);
  }

  // 온체인 카드
  let onchainCard =
    Array.from(document.querySelectorAll(".metric-card")).find((c) =>
      (c.textContent || "").includes("온체인")
    ) || document.querySelectorAll(".metric-card")[1] || document.body;

  if (!$("#onchain-tvl")) {
    const line = document.createElement("div");
    line.innerHTML = `TVL: <span id="onchain-tvl">-</span>`;
    onchainCard.appendChild(line);
  }
}

// 김프 갱신 (Worker의 premium 엔드포인트만 호출)
async function updatePremium() {
  ensureSlots();
  const pctEl = $("#kimchi-premium");
  const upbitEl = $("#upbit-krw");
  const globalEl = $("#global-krw");
  const usdkrwEl = $("#usd-krw");
  const statusEl = $("#status");

  try {
    const res = await fetch(`${API_BASE}/premium?symbol=BTC`);
    const j = await res.json(); // j: { ok, upbitPrice, globalUsd, usdkrw, globalKrw, premiumPct, ... }

    if (!j.ok || typeof j.premiumPct !== "number") {
      throw new Error("premium not ready");
    }

    pctEl.textContent = `${j.premiumPct.toFixed(2)}%`;
    upbitEl.textContent = j.upbitPrice ? `${Math.round(j.upbitPrice).toLocaleString()} 원` : "-";
    globalEl.textContent = j.globalKrw ? `${Math.round(j.globalKrw).toLocaleString()} 원` : "-";
    usdkrwEl.textContent = j.usdkrw ? j.usdkrw.toFixed(2) : "-";
    if (statusEl) statusEl.textContent = "";
  } catch (_) {
    // 에러 시 조용히 유지
    pctEl.textContent = "--%";
    if (statusEl) statusEl.textContent = "오류";
  }
}

// 온체인 갱신 (Worker의 onchain 엔드포인트만 호출)
async function updateOnchain() {
  ensureSlots();
  const tvlEl = $("#onchain-tvl");
  try {
    const res = await fetch(`${API_BASE}/onchain?symbol=ETH`);
    const j = await res.json(); // { ok, tvl, ... }
    if (j.ok && j.tvl) {
      tvlEl.textContent = Number(j.tvl).toLocaleString("en-US");
    } else {
      tvlEl.textContent = "-";
    }
  } catch (_) {
    tvlEl.textContent = "-";
  }
}

// 초기 실행 & 주기 갱신
function init() {
  updatePremium();
  updateOnchain();
  setInterval(updatePremium, 10_000); // 10초
  setInterval(updateOnchain, 60_000); // 1분
}
window.addEventListener("load", init);
