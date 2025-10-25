// ================================
// zzeol-wallet 프론트 스크립트 (업비트 + 온체인)
// 기존 기능 유지 + 심볼 일관 처리 + 오류표시
// HTML에 아래 id가 있어야 함:
// - #symbol-select (ETH/BTC/SOL 드롭다운)
// - #kimchi-premium (김프 카드 박스)
// - #onchain-tvl, #onchain-active, #onchain-volume (온체인 지표)
// ================================

// 1) 워커 주소만 맞춰주세요
const PROXY = "https://satoshi-proxy.mujukno1.workers.dev";

// 2) 심볼 읽기 (드롭다운 없으면 기본 ETH)
function getSymbol() {
  const sel = document.querySelector("#symbol-select");
  const val = (sel?.value || "ETH").toUpperCase();
  return ["BTC", "ETH", "SOL", "XRP", "ADA", "DOGE", "SHIB"].includes(val)
    ? val
    : "ETH";
}

// 3) 김치 프리미엄
async function loadPremium() {
  const sym = getSymbol();
  const box = document.getElementById("kimchi-premium");
  try {
    box && (box.innerHTML = "불러오는 중...");
    const res = await fetch(`${PROXY}/api/premium?symbol=${sym}`);
    const j = await res.json();

    if (!j?.ok) throw new Error("premium api fail");
    const pct = j.premium_pct ?? 0;

    box &&
      (box.innerHTML = `
        <strong>${pct.toFixed(2)}%</strong>
        <br>업비트 KRW: ${fmtKRW(j.upbit_krw)} 원
        <br>글로벌 KRW: ${fmtKRW(j.global_krw)} 원
        <br>USD/KRW: ${fmtNum(j.usdkrw)} 원/$
      `);
  } catch (e) {
    box && (box.innerHTML = `오류: ${e.message}`);
  }
}

// 4) 온체인 지표
async function loadOnchain() {
  const sym = getSymbol();
  const elTVL = document.getElementById("onchain-tvl");
  const elAct = document.getElementById("onchain-active");
  const elVol = document.getElementById("onchain-volume");
  try {
    elTVL && (elTVL.textContent = "불러오는 중...");
    elAct && (elAct.textContent = "불러오는 중...");
    elVol && (elVol.textContent = "불러오는 중...");

    const res = await fetch(`${PROXY}/api/onchain?symbol=${sym}`);
    const j = await res.json();
    if (!j?.ok) throw new Error("onchain api fail");

    elTVL && (elTVL.textContent = j.tvl_usd != null ? fmtUSD(j.tvl_usd) : "-");
    elAct &&
      (elAct.textContent =
        j.active_addresses_24h != null ? fmtNum(j.active_addresses_24h) : "-");
    elVol &&
      (elVol.textContent =
        j.tx_volume_usd_24h != null ? fmtUSD(j.tx_volume_usd_24h) : "-");
  } catch (e) {
    elTVL && (elTVL.textContent = "오류");
    elAct && (elAct.textContent = "오류");
    elVol && (elVol.textContent = "오류");
  }
}

// 5) 헬퍼
function fmtNum(n) {
  return Number(n || 0).toLocaleString();
}
function fmtKRW(n) {
  return Number(n || 0).toLocaleString();
}
function fmtUSD(n) {
  const v = Number(n || 0);
  if (v >= 1e9) return (v / 1e9).toFixed(2) + " B$";
  if (v >= 1e6) return (v / 1e6).toFixed(2) + " M$";
  if (v >= 1e3) return (v / 1e3).toFixed(2) + " K$";
  return v.toFixed(0) + " $";
}

// 6) 이벤트/자동 새로고침
function hookEvents() {
  const sel = document.querySelector("#symbol-select");
  if (sel && !sel.__bound) {
    sel.addEventListener("change", refreshAll);
    sel.__bound = true;
  }
}

async function refreshAll() {
  hookEvents();
  await Promise.all([loadPremium(), loadOnchain()]);
}

window.addEventListener("DOMContentLoaded", () => {
  refreshAll();
  // 20초마다 갱신
  setInterval(refreshAll, 20000);
});
