// ====== 1) API 베이스 ======
const API_BASE_URL = "https://satoshijibag-api.vercel.app"; // ← 반드시 절대경로

// ====== 2) 안전 fetch 헬퍼 ======
async function get(path, params = {}) {
  const url = new URL(API_BASE_URL + path);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString(), { cache: "no-store" });
  const text = await res.text();

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}\n${text.slice(0, 200)}`);
  }
  const ct = (res.headers.get("content-type") || "").toLowerCase();
  if (!ct.includes("application/json")) {
    throw new Error(`Expected JSON but got ${ct}\n${text.slice(0, 200)}`);
  }
  return JSON.parse(text);
}

// ====== 3) DOM ======
const $ = (s) => document.querySelector(s);
const tbody = $("#tbody");
const wsStatus = $("#ws-status");
const apiStatus = $("#api-status");

const el = {
  search: $("#search"),
  refresh: $("#btn-refresh"),
  selName: $("#sel-name"),
  selSymbol: $("#sel-symbol"),
  selState: $("#sel-state"),
  selChange24: $("#sel-change24"),

  price: $("#m-price"),
  buys: $("#m-buys"),
  sells: $("#m-sells"),
  stop: $("#m-stop"),
  risk: $("#m-risk"),
  remark: $("#m-remark"),

  boxEma: $("#box-ema"),
  boxAtr: $("#box-atr"),
  boxTicks: $("#box-ticks"),
};

// ====== 4) 상태/헬스 체크 ======
async function checkHealth() {
  try {
    const r = await get("/api/health");
    wsStatus.textContent = "정상 연결";
    wsStatus.className = "ok";
    apiStatus.textContent = "정상";
  } catch (e) {
    wsStatus.textContent = "연결 실패";
    wsStatus.className = "bad";
    apiStatus.textContent = "오류";
    console.error(e);
  }
}

// ====== 5) 마켓 목록 & 테이블 바인딩 ======
let marketsKRW = [];     // [{market:"KRW-ETH", korean_name:"이더리움", english_name:"Ethereum"}]
let lastSelect = null;   // "KRW-ETH"

async function loadMarkets() {
  const data = await get("/api/markets");
  marketsKRW = data.filter(m => m.market?.startsWith("KRW-"));
  renderTableSkeleton();
  // 첫 로드시 상위 1개 자동 선택
  if (!lastSelect && marketsKRW.length) selectSymbol(marketsKRW[0].market);
}

function renderTableSkeleton() {
  tbody.innerHTML = marketsKRW.map(m =>
    `<tr data-m="${m.market}">
       <td class="muted">${m.market.replace("KRW-","")}</td>
       <td>${m.korean_name || "-"}</td>
       <td class="muted" data-x="price">-</td>
       <td class="muted" data-x="chg">-</td>
       <td class="muted" data-x="vol">-</td>
     </tr>`
  ).join("");

  // click 바인딩
  tbody.querySelectorAll("tr").forEach(tr => {
    tr.addEventListener("click", () => selectSymbol(tr.dataset.m));
  });
}

// ====== 6) 실시간 티커(현재가/등락/거래대금) 갱신 ======
async function tickLoop() {
  if (!marketsKRW.length) return;
  try {
    // 티커는 20~30종씩 끊어서 요청(쿼리 길이 방지)
    const chunk = (arr, n) => arr.reduce((a,_,i)=> (i%n? a[a.length-1].push(arr[i]):a.push([arr[i]]),a), []);
    const chunks = chunk(marketsKRW.map(m=>m.market), 50);

    let all = [];
    for (const c of chunks) {
      const r = await get("/api/ticker", { markets: c.join(",") });
      all = all.concat(r);
    }
    // DOM 반영
    all.forEach(t => {
      const tr = tbody.querySelector(`tr[data-m="${t.market}"]`);
      if (!tr) return;
      tr.querySelector('[data-x="price"]').textContent = toKRW(t.trade_price);
      tr.querySelector('[data-x="chg"]').innerHTML =
        (t.signed_change_rate*100>=0? `<span class="pos">+${(t.signed_change_rate*100).toFixed(2)}%</span>`:
                                       `<span class="neg">${(t.signed_change_rate*100).toFixed(2)}%</span>`);
      tr.querySelector('[data-x="vol"]').textContent = toKRW(t.acc_trade_price_24h) + "원";
    });

    // 선택된 심볼 자동 갱신
    if (lastSelect) updateSelected(lastSelect);
  } catch (e) {
    console.error("ticker error", e);
  } finally {
    setTimeout(tickLoop, 5000);
  }
}

// ====== 7) 선택 종목 상세(캔들로 ATR/EMA/타점) ======
async function selectSymbol(market) {
  lastSelect = market;
  const info = marketsKRW.find(m => m.market === market);
  el.selName.textContent = info?.korean_name ?? "-";
  el.selSymbol.textContent = market ?? "-";
  el.selState.textContent  = "갱신중…";
  el.selChange24.textContent = "-";
  el.price.textContent = "-"; el.buys.textContent="-"; el.sells.textContent="-";
  el.stop.textContent="-"; el.risk.textContent="-"; el.remark.textContent="-";
  el.boxEma.textContent="-"; el.boxAtr.textContent="-"; el.boxTicks.textContent="-";

  await updateSelected(market);
}

async function updateSelected(market) {
  try {
    // 티커(현재가/등락)
    const [t] = await get("/api/ticker", { markets: market });

    // 캔들(5분, 200개)로 ATR14/EMA20 계산
    const cs  = await get("/api/candles", { market, unit: 5, count: 200 });

    const closes = cs.map(c=>c.trade_price).reverse();
    const highs  = cs.map(c=>c.high_price).reverse();
    const lows   = cs.map(c=>c.low_price).reverse();

    const ema20 = EMA(closes, 20).at(-1);
    const atr14 = ATR(highs, lows, closes, 14).at(-1);
    const price = t.trade_price;

    // 리스크(ATR 퍼센트) & 간단 타점
    const atrPct = atr14 / price;                    // 변동성 비율
    const stop  = Math.max(price - atr14, 0);        // 손절(1x ATR)
    const tp1   = price + atr14 * 1.0;               // 익절1
    const tp2   = price + atr14 * 1.6;               // 익절2
    const tp3   = price + atr14 * 2.2;               // 익절3

    // 매수 타점(EMA 근처, 분할 3칸)
    const b1 = Math.max(ema20 - atr14*0.4, 0);
    const b2 = Math.max(ema20 - atr14*0.8, 0);
    const b3 = Math.max(ema20 - atr14*1.2, 0);

    // 위험도 라벨
    const riskLabel = atrPct < 0.004 ? "낮음" : atrPct < 0.009 ? "중간" : "높음";

    // 쩔어한마디
    const remark = (() => {
      if (atrPct < 0.004 && price > ema20) return "완만한 우상향, 분할 접근";
      if (atrPct >= 0.009) return "변동 급증(블랙스완). 진입 자제/짧은 손절 필수";
      if (price < ema20) return "추세 하방. 큰 비중 진입 금지";
      return "중립—완만한 우상향, 분할 접근";
    })();

    // 표시
    el.selState.textContent = t.signed_change_rate*100>=0 ? "상승" : "하락";
    el.selChange24.innerHTML = t.signed_change_rate*100>=0
      ? `<span class="pos">+${(t.signed_change_rate*100).toFixed(2)}%</span>`
      : `<span class="neg">${(t.signed_change_rate*100).toFixed(2)}%</span>`;

    el.price.textContent = toKRW(price);
    el.buys.textContent  = [b1,b2,b3].map(toKRW).join(" / ");
    el.sells.textContent = [tp1,tp2,tp3].map(toKRW).join(" / ");
    el.stop.textContent  = toKRW(stop);
    el.risk.textContent  = `${riskLabel} (${(atrPct*100).toFixed(2)}%)`;
    el.remark.textContent= remark;

    el.boxEma.textContent = toKRW(ema20);
    el.boxAtr.textContent = `${toKRW(atr14)} (1x)`;
    el.boxTicks.textContent= `+${t.trade_volume?.toLocaleString?.() ?? "-"} (최근 체결 강도 추정)`;
  } catch (e) {
    console.error(e);
  }
}

// ====== 8) 지표(EMA/ATR) 유틸 ======
function EMA(closes, period){
  const k = 2/(period+1);
  let ema = closes[0];
  const out = [ema];
  for (let i=1;i<closes.length;i++){
    ema = closes[i]*k + ema*(1-k);
    out.push(ema);
  }
  return out;
}
function ATR(highs, lows, closes, period){
  const TR = [];
  for (let i=0;i<closes.length;i++){
    if (i===0){ TR.push(highs[i]-lows[i]); continue; }
    const tr = Math.max(
      highs[i]-lows[i],
      Math.abs(highs[i]-closes[i-1]),
      Math.abs(lows[i]-closes[i-1]),
    );
    TR.push(tr);
  }
  // RMA 방식
  const out = [];
  let prev = TR.slice(0,period).reduce((a,b)=>a+b,0)/period;
  out[period-1] = prev;
  for (let i=period;i<TR.length;i++){
    prev = (prev*(period-1) + TR[i]) / period;
    out[i] = prev;
  }
  return out;
}

// ====== 9) 포맷 ======
const toKRW = (n) => {
  if (!Number.isFinite(n)) return "-";
  if (n >= 1_000_000_000) return (n/1_000_000_000).toFixed(2) + "억";
  if (n >= 10_000) return Math.round(n).toLocaleString();
  if (n >= 1) return n.toLocaleString(undefined,{maximumFractionDigits:0});
  return n.toFixed(4);
};

// ====== 10) 검색 ======
el.search.addEventListener("input", (e)=>{
  const q = e.target.value.trim().toLowerCase();
  tbody.querySelectorAll("tr").forEach(tr=>{
    const m = tr.dataset.m.toLowerCase();
    const name = tr.children[1].textContent.toLowerCase();
    tr.style.display = (m.includes(q) || name.includes(q)) ? "" : "none";
  });
});
el.refresh.addEventListener("click", loadMarkets);

// ====== 11) 부트 ======
(async function init(){
  await checkHealth();
  await loadMarkets();
  tickLoop();
})();
