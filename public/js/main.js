const API_BASE = "https://satoshi-proxy.mujukno1.workers.dev/api";

// 숫자/시간 포맷
const fmt = (n) => (n == null || isNaN(n) ? "-" : Number(n).toLocaleString());
const tstr = (ts) => new Date(Number(ts)).toLocaleString();

// 김프 렌더
function renderPremium(d) {
  const pctEl = document.getElementById("premium-pct");
  const label = document.getElementById("premium-label");
  const upEl = document.getElementById("premium-upbit");
  const glEl = document.getElementById("premium-global");
  const biEl = document.getElementById("premium-binance");
  const usEl = document.getElementById("premium-usdkrw");
  const tsEl = document.getElementById("premium-ts");

  if (!d || d.error) {
    if (pctEl) pctEl.textContent = "--%";
    if (label) { label.textContent = "오류"; label.style.background = "#7f1d1d"; }
    return;
  }
  const pct = Number(d.premium_pct ?? 0);
  if (pctEl) pctEl.textContent = `${pct > 0 ? "+" : ""}${pct.toFixed(2)}%`;
  if (label) {
    label.textContent = pct > 0 ? "김프" : pct < 0 ? "역프" : "보합";
    label.style.background = pct > 0 ? "#166534" : pct < 0 ? "#7f1d1d" : "#374151";
  }
  if (upEl) upEl.textContent = fmt(d.upbit_krw) + " 원";
  if (glEl) glEl.textContent = fmt(d.global_krw) + " 원";
  if (biEl) biEl.textContent = fmt(d.binance_usd) + " $";
  if (usEl) usEl.textContent = fmt(d.usdkrw) + " 원/$";
  if (tsEl) tsEl.textContent = "업데이트: " + tstr(d.ts);
}

// 온체인 렌더(더미 대응)
function renderOnchain(d) {
  const tvl = document.getElementById("onchain-tvl");
  const active = document.getElementById("onchain-active");
  const note = document.getElementById("onchain-note");
  const ts = document.getElementById("onchain-ts");
  if (tvl) tvl.textContent = d?.tvl != null ? fmt(d.tvl) : "준비중";
  if (active) active.textContent = d?.active_addresses != null ? fmt(d.active_addresses) : "준비중";
  if (note) note.textContent = d?.note || "";
  if (ts) ts.textContent = d?.ts ? "업데이트: " + tstr(d.ts) : "";
}

// 주기적 호출
async function updatePremium() {
  try {
    const r = await fetch(`${API_BASE}/premium`, { cache: "no-store" });
    renderPremium(await r.json());
  } catch (e) {
    console.error("premium fetch error", e);
    renderPremium(null);
  }
}

async function updateOnchain() {
  const sym = (document.getElementById("onchain-symbol")?.value || "ETH").toUpperCase();
  try {
    const r = await fetch(`${API_BASE}/onchain?symbol=${encodeURIComponent(sym)}`, { cache: "no-store" });
    renderOnchain(await r.json());
  } catch (e) {
    console.error("onchain fetch error", e);
    renderOnchain(null);
  }
}

document.getElementById("onchain-symbol")?.addEventListener("change", updateOnchain);
document.addEventListener("DOMContentLoaded", () => {
  updatePremium(); updateOnchain();
  setInterval(updatePremium, 3000);
  setInterval(updateOnchain, 5000);
});
