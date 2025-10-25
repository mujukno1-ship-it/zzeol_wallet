// ✅ 사토시의지갑 main.js (ID 매칭판)
const API_BASE = "https://satoshi-proxy.mujukno1.workers.dev/api";

function setText(sel, text) { const el = document.querySelector(sel); if (el) el.textContent = text; }

async function loadPremium() {
  try {
    const res = await fetch(`${API_BASE}/premium?symbol=BTC`);
    const j = await res.json();
    if (!j.ok || typeof j.premiumPct !== "number") throw new Error(j.error || "premium not ready");

    setText("#kimchi-premium", `${j.premiumPct.toFixed(2)}%`);
    setText("#upbit-krw", j.upbitPrice ? `${Math.round(j.upbitPrice).toLocaleString()} 원` : "-");
    setText("#global-krw", j.globalKrw ? `${Math.round(j.globalKrw).toLocaleString()} 원` : "-");
    setText("#usd-krw", j.usdkrw ? j.usdkrw.toFixed(2) : "-");
    setText("#status", "");
    console.log("✅ premium OK", j);
  } catch (e) {
    setText("#kimchi-premium", "--%");
    setText("#status", "오류");
    console.warn("premium error:", e);
  }
}

async function loadOnchain() {
  try {
    const res = await fetch(`${API_BASE}/onchain?symbol=ETH`);
    const j = await res.json();
    if (!j.ok) throw new Error(j.error || "onchain not ready");

    setText("#onchain-tvl", j.tvl ? Number(j.tvl).toLocaleString("en-US") : "-");
    setText("#onchain-active", j.activeAddress ? Number(j.activeAddress).toLocaleString("en-US") : "-");
    console.log("✅ onchain OK", j);
  } catch (e) {
    setText("#onchain-tvl", "-");
    setText("#onchain-active", "-");
    console.warn("onchain error:", e);
  }
}

window.addEventListener("load", () => {
  console.log("✅ using /public/js/main.js (final2)");
  loadPremium();
  loadOnchain();
  setInterval(loadPremium, 10_000);
  setInterval(loadOnchain, 60_000);
});
