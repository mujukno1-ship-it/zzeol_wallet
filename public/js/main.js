// ===============================
// 사토시의지갑 main.js 완전교체본 (2025-10-25 최신)
// ===============================

const API_BASE = "https://satoshi-proxy.mujukno1.workers.dev/api";

const $ = (s) => document.querySelector(s);

function ensureSlots() {
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
    kimchiCard.prepend(top);
  }

  if (!$("#upbit-krw")) {
    kimchiCard.insertAdjacentHTML(
      "beforeend",
      `<ul style="list-style:none;padding:0;margin:8px 0">
        <li>업비트 KRW: <span id="upbit-krw">-</span></li>
        <li>글로벌 KRW: <span id="global-krw">-</span></li>
        <li>USD/KRW: <span id="usd-krw">-</span></li>
        <li id="status">불러오는 중...</li>
      </ul>`
    );
  }

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

async function updatePremium() {
  ensureSlots();
  const pctEl = $("#kimchi-premium");
  const upbitEl = $("#upbit-krw");
  const globalEl = $("#global-krw");
  const usdkrwEl = $("#usd-krw");
  const statusEl = $("#status");

  try {
    const res = await fetch(`${API_BASE}/premium?symbol=BTC`);
    const j = await res.json();
    if (!j.ok || typeof j.premiumPct !== "number") throw new Error();

    pctEl.textContent = `${j.premiumPct.toFixed(2)}%`;
    upbitEl.textContent = j.upbitPrice
      ? `${Math.round(j.upbitPrice).toLocaleString()} 원`
      : "-";
    globalEl.textContent = j.globalKrw
      ? `${Math.round(j.globalKrw).toLocaleString()} 원`
      : "-";
    usdkrwEl.textContent = j.usdkrw ? j.usdkrw.toFixed(2) : "-";
    statusEl.textContent = "";
  } catch {
    pctEl.textContent = "--%";
    statusEl.textContent = "오류";
  }
}

async function updateOnchain() {
  ensureSlots();
  const tvlEl = $("#onchain-tvl");
  try {
    const res = await fetch(`${API_BASE}/onchain?symbol=ETH`);
    const j = await res.json();
    if (j.ok && j.tvl) {
      tvlEl.textContent = Number(j.tvl).toLocaleString("en-US");
    } else {
      tvlEl.textContent = "-";
    }
  } catch {
    tvlEl.textContent = "-";
  }
}

function init() {
  updatePremium();
  updateOnchain();
  setInterval(updatePremium, 10000);
  setInterval(updateOnchain, 60000);
}

window.addEventListener("load", init);
