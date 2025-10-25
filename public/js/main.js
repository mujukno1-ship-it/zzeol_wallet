// ===============================
// 사토시의지갑 - 실시간 업비트 + 온체인 연동 (쩔어버전)
// ===============================

// ⚙️ API 연결 주소 (Cloudflare Worker 프록시)
const API_BASE = "https://satoshi-proxy.mujukno1.workers.dev/api";

// ===============================
// 🪙 김치 프리미엄 불러오기
// ===============================
async function loadKimchi(symbol = "BTC") {
  const pctEl = document.querySelector("#kimchi-premium");
  const upbitEl = document.querySelector("#upbit-krw");
  const globalEl = document.querySelector("#global-krw");
  const usdkrwEl = document.querySelector("#usd-krw");
  const statusEl = document.querySelector("#status");

  try {
    const res = await fetch(`${API_BASE}/premium?symbol=${symbol}`);
    const data = await res.json();

    if (!data.ok) throw new Error("premium error");

    const pct = data.premiumPct?.toFixed(2);
    const upbit = data.upbitPrice?.toLocaleString();
    const global = Math.round(data.globalKrw)?.toLocaleString();
    const usdkrw = data.usdkrw?.toFixed(2);

    pctEl.textContent = `${pct}%`;
    upbitEl.textContent = `${upbit} 원`;
    globalEl.textContent = `${global} 원`;
    usdkrwEl.textContent = usdkrw;
    statusEl.textContent = "";
  } catch (err) {
    pctEl.textContent = "--%";
    upbitEl.textContent = "-";
    globalEl.textContent = "-";
    usdkrwEl.textContent = "-";
    statusEl.textContent = "오류";
  }
}

// ===============================
// 🔗 온체인 데이터 불러오기 (TVL)
// ===============================
async function loadOnchain(symbol = "ETH") {
  const tvlEl = document.querySelector("#onchain-tvl");
  const addrEl = document.querySelector("#onchain-active");
  try {
    const res = await fetch(`${API_BASE}/onchain?symbol=${symbol}`);
    const data = await res.json();

    if (!data.ok) throw new Error("onchain error");

    const tvl = Number(data.tvl || 0).toLocaleString("en-US");
    tvlEl.textContent = tvl;
    addrEl.textContent = "-";
  } catch (e) {
    tvlEl.textContent = "-";
    addrEl.textContent = "-";
  }
}

// ===============================
// 🚀 초기 실행 및 자동 갱신
// ===============================
function init() {
  const statusEl = document.querySelector("#status");
  if (statusEl) statusEl.textContent = "불러오는 중...";

  loadKimchi();
  loadOnchain();

  // 10초마다 김프 갱신
  setInterval(() => loadKimchi(), 10000);
  // 1분마다 온체인 갱신
  setInterval(() => loadOnchain(), 60000);
}

// 페이지 로드 후 자동 실행
window.addEventListener("load", init);
