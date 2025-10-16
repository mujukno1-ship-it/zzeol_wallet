// ===== 업비트 현재가 전용 =====
// 심볼 → 업비트 마켓 코드 매핑 (필요 시 추가)
const UPBIT = {
  btc: "KRW-BTC",
  eth: "KRW-ETH",
  sol: "KRW-SOL",
  xrp: "KRW-XRP",
  doge: "KRW-DOGE",
  ada: "KRW-ADA",
  shib: "KRW-SHIB",
};

// 업비트 KRW 가격단위(틱사이즈) 반영
function krwTickUnit(price) {
  if (price >= 2000000) return 1000;
  if (price >= 1000000) return 500;
  if (price >= 500000)  return 100;
  if (price >= 100000)  return 50;
  if (price >= 10000)   return 10;
  if (price >= 1000)    return 1;
  if (price >= 100)     return 0.1;
  if (price >= 10)      return 0.01;
  return 0.001; // 소수코인
}
function roundToTick(p) {
  const u = krwTickUnit(p);
  return Math.round(p / u) * u;
}

const $ = (s) => document.querySelector(s);
const els = {
  input: $("#symbol"),
  btn: $("#btnFetch"),
  price: $("#priceArea"),
  risk: $("#riskArea"),
  status: $("#status"),
  auto: $("#autoToggle"),
};

let lastCode = "KRW-BTC";
let timer = null;

// 간단/안정 fetch (타임아웃)
async function safeFetch(url, { timeout = 7000 } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeout);
  try {
    const r = await fetch(url, { signal: ctrl.signal });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } finally {
    clearTimeout(t);
  }
}

function toUpbitCode(input) {
  const s = (input || "").trim().toLowerCase();
  if (!s) return null;
  // 사용자가 "krw-btc"라고 써도 허용
  if (s.startsWith("krw-")) return s.toUpperCase();
  return (UPBIT[s] || `KRW-${s.toUpperCase()}`);
}

function fmtKRW(n) {
  try {
    return new Intl.NumberFormat("ko-KR").format(n);
  } catch { return String(n); }
}

// 아주 단순 리스크 힌트: 24h 거래대금/시총이 없으므로 등락률 근사만 표시
function riskBadgeByChange(rate) {
  if (rate === null || rate === undefined) return "";
  const p = Math.abs(rate * 100);
  if (p >= 8)  return `<span class="badge danger">Risk: High</span>`;
  if (p >= 3)  return `<span class="badge warn">Risk: Mid</span>`;
  return `<span class="badge ok">Risk: Low</span>`;
}

async function draw(code) {
  try {
    const mkt = code || toUpbitCode(els.input.value) || lastCode;
    const url = `https://api.upbit.com/v1/ticker?markets=${encodeURIComponent(mkt)}`;
    els.status.textContent = "업비트에서 현재가 불러오는 중…";
    const data = await safeFetch(url);
    if (!Array.isArray(data) || data.length === 0) throw new Error("no data");

    const t = data[0];
    // Upbit 필드
    const price = roundToTick(t.trade_price); // 틱사이즈 반영
    const rate = t.signed_change_rate;        // -0.0123 = -1.23%
    const ratePct = (rate * 100).toFixed(2);
    const acc24 = t.acc_trade_price_24h;      // 24h 거래대금(KRW)

    lastCode = mkt;
    els.price.innerHTML = `
      <b>${mkt}</b> → <b>${fmtKRW(price)} KRW</b>
      <small style="color:${rate >= 0 ? '#00ff7f' : '#ff4d4f'}">
        ${ratePct}%
      </small>
      <br/>24h 거래대금: ₩${fmtKRW(Math.round(acc24))}
    `;
    els.risk.innerHTML = riskBadgeByChange(rate);
    els.status.textContent = `업데이트: ${new Date().toLocaleTimeString()}`;
  } catch (e) {
    els.status.textContent = `업비트 호출 실패: ${e.message}`;
  }
}

function startAuto() { stopAuto(); timer = setInterval(() => draw(lastCode), 3000); }
function stopAuto()  { if (timer) clearInterval(timer); timer = null; }

els.btn.addEventListener("click", () => draw());
els.input.addEventListener("keydown", (e) => { if (e.key === "Enter") draw(); });
els.auto.addEventListener("change", () => (els.auto.checked ? startAuto() : stopAuto()));

// 초기값: BTC
els.input.value = "btc";
draw("KRW-BTC").then(() => startAuto());
