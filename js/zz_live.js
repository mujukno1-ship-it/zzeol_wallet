// 간단/안정 fetch 유틸 (타임아웃 + 오류메시지)
async function safeFetch(url, { timeout = 8000 } = {}) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(id);
  }
}

// 심볼 → 코인 ID 매핑(필요시 추가)
const MAP = {
  btc: "bitcoin",
  eth: "ethereum",
  sol: "solana",
  xrp: "ripple",
  doge: "dogecoin",
  ada: "cardano",
};

const els = {
  input: document.querySelector("#symbol"),
  btn: document.querySelector("#btnFetch"),
  price: document.querySelector("#priceArea"),
  risk: document.querySelector("#riskArea"),
  status: document.querySelector("#status"),
  auto: document.querySelector("#autoToggle"),
};

let timer = null;
let lastSymbol = "btc"; // 기본값

function fmt(n) {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + "B";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(2) + "K";
  return String(n);
}

function riskBadge(vol, change24h) {
  // 아주 간단한 휴리스틱: 변동성/등락폭 기준
  if (Math.abs(change24h) >= 8 || vol >= 0.08) {
    return `<span class="badge danger">Risk: High</span>`;
  }
  if (Math.abs(change24h) >= 3 || vol >= 0.03) {
    return `<span class="badge warn">Risk: Mid</span>`;
  }
  return `<span class="badge ok">Risk: Low</span>`;
}

async function draw(symbol) {
  const sym = (symbol || els.input.value || lastSymbol).trim().toLowerCase();
  const id = MAP[sym] || sym; // 심볼 그대로도 시도(사용자가 id 입력 시)
  els.status.textContent = "불러오는 중…";
  try {
    // CoinGecko (CORS 허용, 키 불필요)
    const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${encodeURIComponent(id)}&price_change_percentage=24h`;
    const [data] = await safeFetch(url);
    if (!data) throw new Error("no data");

    lastSymbol = sym;
    els.price.innerHTML = `
      <b>${data.name}</b> (${data.symbol.toUpperCase()})  
      → $${Number(data.current_price).toLocaleString()} 
      <small style="color:${data.price_change_percentage_24h >= 0 ? '#00ff7f' : '#ff4d4f'}">
        ${data.price_change_percentage_24h.toFixed(2)}%
      </small>
      <br/>
      시총: $${fmt(data.market_cap)} · 거래대금: $${fmt(data.total_volume)}
    `;

    // 간단 변동성 근사치: 거래대금/시총 비율
    const volRatio = (data.total_volume || 0) / Math.max(1, data.market_cap || 1);
    els.risk.innerHTML = riskBadge(volRatio, data.price_change_percentage_24h || 0);

    const ts = new Date().toLocaleTimeString();
    els.status.textContent = `업데이트: ${ts}`;
  } catch (e) {
    els.status.textContent = `불러오기 실패: ${e.message}`;
  }
}

// 버튼/엔터
els.btn.addEventListener("click", () => draw());
els.input.addEventListener("keydown", (e) => {
  if (e.key === "Enter") draw();
});

// 자동 새로고침
function startAuto() {
  stopAuto();
  timer = setInterval(() => draw(lastSymbol), 15000);
}
function stopAuto() { if (timer) clearInterval(timer); timer = null; }
els.auto.addEventListener("change", () => (els.auto.checked ? startAuto() : stopAuto()));

// 초기 로드
els.input.value = lastSymbol;
draw(lastSymbol).then(() => startAuto());
