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
// ===== 김프 + 온체인 표시 한방 스크립트 =====
const API_BASE = "https://satoshi-proxy.mujukno1.workers.dev/api";

// 숫자/시간 포맷
const fmt = (n) => (n == null || isNaN(n) ? "-" : Number(n).toLocaleString());
const tstr = (ts) => new Date(Number(ts)).toLocaleString();

// DOM 보정: 없으면 만들어서라도 꽂는다
function need(id, fallbackParentSel, html) {
  let el = document.getElementById(id);
  if (!el && fallbackParentSel) {
    const box = document.querySelector(fallbackParentSel);
    if (box) {
      box.insertAdjacentHTML("beforeend", html);
      el = document.getElementById(id);
    }
  }
  return el;
}

// 김프 렌더
function renderPremium(d) {
  const pctEl = need("premium-pct", ".premium-box, #kimchi-card",
    `<div id="premium-pct" style="font-size:28px;font-weight:800">--%</div>`);
  const label = need("premium-label", ".premium-box, #kimchi-card",
    `<span id="premium-label" style="padding:2px 8px;border-radius:999px;background:#374151;font-size:12px;margin-left:8px">계산중</span>`);
  const upEl = need("premium-upbit", ".premium-box, #kimchi-card", `<div>업비트 KRW: <b id="premium-upbit">-</b></div>`);
  const glEl = need("premium-global",".premium-box, #kimchi-card", `<div>글로벌 KRW: <b id="premium-global">-</b></div>`);
  const biEl = need("premium-binance",".premium-box, #kimchi-card", `<div>Binance: <b id="premium-binance">-</b></div>`);
  const usEl = need("premium-usdkrw",".premium-box, #kimchi-card", `<div>USD/KRW: <b id="premium-usdkrw">-</b></div>`);
  const tsEl = need("premium-ts",".premium-box, #kimchi-card", `<div id="premium-ts" style="opacity:.6"></div>`);

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
  if (upEl) upEl.textContent = `${fmt(d.upbit_krw)} 원`;
  if (glEl) glEl.textContent = `${fmt(d.global_krw)} 원`;
  if (biEl) biEl.textContent = `${fmt(d.binance_usd)} $`;
  if (usEl) usEl.textContent = `${fmt(d.usdkrw)} 원/$`;
  if (tsEl) tsEl.textContent = `업데이트: ${tstr(d.ts)}`;
}

// 온체인 렌더(더미 대응)
function renderOnchain(d) {
  const tvl = need("onchain-tvl", "#onchain-card", `<div>TVL: <b id="onchain-tvl">-</b></div>`);
  const active = need("onchain-active", "#onchain-card", `<div>활성 주소수: <b id="onchain-active">-</b></div>`);
  const note = need("onchain-note", "#onchain-card", `<div id="onchain-note" style="opacity:.6"></div>`);
  const ts = need("onchain-ts", "#onchain-card", `<div id="onchain-ts" style="opacity:.6"></div>`);

  if (tvl) tvl.textContent = d?.tvl != null ? fmt(d.tvl) : "준비중";
  if (active) active.textContent = d?.active_addresses != null ? fmt(d.active_addresses) : "준비중";
  if (note) note.textContent = d?.note || "";
  if (ts) ts.textContent = d?.ts ? `업데이트: ${tstr(d.ts)}` : "";
}

// 주기 갱신
async function updatePremium() {
  try {
    const r = await fetch(`${API_BASE}/premium`, { cache: "no-store", mode: "cors" });
    const d = await r.json();
    renderPremium(d);
  } catch (e) {
    console.error("premium fetch error", e);
    renderPremium(null);
  }
}
async function updateOnchain() {
  const symSel = document.getElementById("onchain-symbol");
  const sym = (symSel?.value || "ETH").toUpperCase();
  try {
    const r = await fetch(`${API_BASE}/onchain?symbol=${encodeURIComponent(sym)}`, { cache: "no-store", mode: "cors" });
    const d = await r.json();
    renderOnchain(d);
  } catch (e) {
    console.error("onchain fetch error", e);
    renderOnchain(null);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  updatePremium(); updateOnchain();
  setInterval(updatePremium, 3000);
  setInterval(updateOnchain, 5000);
});
(async () => {
  try {
    const p = await (await fetch("https://satoshi-proxy.mujukno1.workers.dev/api/premium", {cache:"no-store"})).json();
    console.log("premium test:", p);
    const o = await (await fetch("https://satoshi-proxy.mujukno1.workers.dev/api/onchain?symbol=ETH", {cache:"no-store"})).json();
    console.log("onchain test:", o);
  } catch(e) {
    console.error("front fetch error:", e);
  }
})();
