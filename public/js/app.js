console.log("[쩔어지갑] app.js 로드 ✅");

/************** 공통 함수 **************/
const toStr = (v) => (v == null ? "" : String(v));
const toNum = (v, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};
function getEl(id){ return document.getElementById(id); }

/************** 검색 기능 **************/
function getQuery() {
  const raw = getEl("search-input") ? getEl("search-input").value : "";
  return toStr(raw).trim().toLowerCase();
}

function renderRows(rows) {
  const tbody = getEl("search-body");
  if (!tbody) return;

  tbody.innerHTML = (rows || []).map(r => {
    const ko   = toStr(r.kr_name || r.korean || r.name_kr || r.name);
    const sym  = toStr(r.symbol || r.ticker || r.code);
    const px   = toNum(r.price_krw ?? r.price ?? r.close, 0).toLocaleString("ko-KR");
    const buy  = toNum(r.buy ?? r.entry ?? r.tp_buy, 0).toLocaleString("ko-KR");
    const sell = toNum(r.sell ?? r.tp ?? r.tp_sell, 0).toLocaleString("ko-KR");
    const sl   = toNum(r.sl ?? r.stop ?? r.stop_loss, 0).toLocaleString("ko-KR");
    const risk = toStr(r.risk ?? "");
    const preS = toStr(r.preheat_start ?? "");
    const preE = toStr(r.preheat_end ?? "");
    const cmt  = toStr(r.comment ?? "");

    return `
      <tr>
        <td>${ko}</td><td>${sym}</td><td>${px}</td>
        <td>${buy}</td><td>${sell}</td><td>${sl}</td>
        <td>${risk}</td><td>${preS}</td><td>${preE}</td><td>${cmt}</td>
      </tr>`;
  }).join("");
}

function applySearch(allRows) {
  const q = getQuery();
  if (!q) return renderRows(allRows);
  const filtered = (allRows || []).filter(r => {
    const ko = toStr(r.kr_name || r.name_kr || "").toLowerCase();
    const sym = toStr(r.symbol || "").toLowerCase();
    return ko.includes(q) || sym.includes(q);
  });
  renderRows(filtered);
}

(function wireSearch() {
  const el = getEl("search-input");
  if (!el) return;
  el.addEventListener("input", () => applySearch(window.__ALL_ROWS__ || []));
})();

function setDataAndRender(rows) {
  window.__ALL_ROWS__ = Array.isArray(rows) ? rows : [];
  applySearch(window.__ALL_ROWS__);
}

/************** 업비트 연동 **************/
const UPBIT_BASE = "https://api.upbit.com/v1";

async function fetchKRWMarkets() {
  const res = await fetch(`${UPBIT_BASE}/market/all?isDetails=true`);
  const list = await res.json();
  const krw = list.filter(x => x.market.startsWith("KRW-"));
  const nameMap = {};
  krw.forEach(x => {
    nameMap[x.market] = {
      ko: x.korean_name,
      sym: (x.market.split("-")[1] || "").toUpperCase()
    };
  });
  return { markets: krw.map(x => x.market), nameMap };
}

async function fetchTickers(markets) {
  const chunkSize = 30;
  const all = [];
  for (let i=0;i<markets.length;i+=chunkSize) {
    const url = `${UPBIT_BASE}/ticker?markets=${encodeURIComponent(markets.slice(i, i+chunkSize).join(","))}`;
    const res = await fetch(url);
    const arr = await res.json();
    all.push(...arr);
  }
  return all;
}
// === Upbit KRW tick unit (2025-07-31 변경 반영) ===
// 참고: 업비트 개발자센터 공지에 따른 가격구간별 호가단위. :contentReference[oaicite:0]{index=0}
function krwTickUnit(p) {
  const x = Number(p);
  if (!Number.isFinite(x)) return 1;

  if (x >= 2_000_000) return 1000;
  if (x >= 1_000_000) return 1000;   // 변경 후 500 -> 1000
  if (x >=   500_000) return 500;    // 변경 후 100 -> 500
  if (x >=   100_000) return 100;    // 변경 후 50 -> 100
  if (x >=    50_000) return 50;     // 신설 구간
  if (x >=    10_000) return 10;
  if (x >=     5_000) return 5;      // 신설 구간
  if (x >=     1_000) return 1;
  if (x >=       100) return 1;      // 변경 후 0.1 -> 1
  if (x >=        10) return 0.1;    // 변경 후 0.01 -> 0.1
  if (x >=         1) return 0.01;   // 변경 후 0.001 -> 0.01
  if (x >=       0.1) return 0.001;  // 변경 후 0.0001 -> 0.001
  if (x >=      0.01) return 0.0001; // 변경 후 0.00001 -> 0.0001
  if (x >=     0.001) return 0.00001;
  if (x >=    0.0001) return 0.000001;
  if (x >=   0.00001) return 0.0000001;
  return 0.00000001;
}

// dir: "round" | "floor" | "ceil"
function roundToTick(p, dir = "round") {
  const u = krwTickUnit(p);
  if (!Number.isFinite(p)) return 0;
  const v = p / u;
  if (dir === "floor") return Math.floor(v) * u;
  if (dir === "ceil")  return Math.ceil(v)  * u;
  return Math.round(v) * u;
}

// KRW 표시용 (호가단위에 맞춰 자리수 자동)
function formatKRW(p) {
  const u = krwTickUnit(p);
  const decimals = (u >= 1) ? 0 : Math.max(0, String(u).split(".")[1]?.length || 0);
  return Number(p).toLocaleString("ko-KR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function buildRows(tickers, nameMap) {
  return tickers.map(t => {
    const m = t.market;
    const n = nameMap[m] || {};
    const p = toNum(t.trade_price, 0);
    const buy = Math.round(p * 0.985);
    const sell = Math.round(p * 1.015);
    const sl = Math.round(p * 0.97);
    return {
      kr_name: n.ko || m,
      symbol: n.sym || (m.split("-")[1] || ""),
      price_krw: p, buy, sell, sl, risk:"1",
      preheat_start:"", preheat_end:"", comment:""
    };
  });
}

async function refreshOnce() {
  try {
    if (!window.__UPBIT__) {
      const { markets, nameMap } = await fetchKRWMarkets();
      window.__UPBIT__ = { markets, nameMap };
    }
    const { markets, nameMap } = window.__UPBIT__;
    const tickers = await fetchTickers(markets);
    const rows = buildRows(tickers, nameMap);
    setDataAndRender(rows);
  } catch (e) {
    console.error("업비트 오류", e);
    setDataAndRender([
      {kr_name:"에테나", symbol:"ENA", price_krw:1234, buy:1200, sell:1300, sl:1100, risk:"1", comment:"임시 표시"},
      {kr_name:"볼타", symbol:"VOLTA", price_krw:345, buy:330, sell:360, sl:300, risk:"1", comment:"임시 표시"}
    ]);
  }
}

let __poll = null;
function applyPolling() {
  if (__poll) clearInterval(__poll);
  const s = Number(getEl("polling-seconds")?.value || 5);
  __poll = setInterval(refreshOnce, s * 1000);
}

(function init() {
  getEl("refresh-btn")?.addEventListener("click", refreshOnce);
  getEl("polling-seconds")?.addEventListener("change", applyPolling);
  refreshOnce();
  applyPolling();
})();
/***** 실시간 급상승 감지 (AI) *****
 * - refreshListPrices()에서 수집한 tmap으로 기록/계산/렌더
 * - 1/3/5분 수익률 + 거래대금 유입률 기반 점수화
 ******************************************/

// 가격/거래대금 히스토리 (최대 20분 유지)
const priceHist = {}; // { code: [{t, price, acc}, ...] }

function recordHistoryFromTickerMap(tmap){
  const now = Date.now();
  Object.keys(tmap).forEach(code=>{
    const t = tmap[code];
    if(!t) return;
    const arr = priceHist[code] || (priceHist[code] = []);
    arr.push({ t: now, price: t.trade_price, acc: t.acc_trade_price_24h||0 });
    // 20분 초과 데이터 제거
    const cutoff = now - 20*60*1000;
    while(arr.length && arr[0].t < cutoff) arr.shift();
  });
}

// 분 단위 변화율 계산 (없으면 0)
function percentChange(code, minutes){
  const arr = priceHist[code]; if(!arr || arr.length < 2) return 0;
  const now = Date.now(); const target = now - minutes*60*1000;
  // target 시점과 가장 가까운 과거 포인트
  let base = arr[0];
  for(let i=0;i<arr.length;i++){ if(arr[i].t >= target){ base = arr[i]; break; } }
  const last = arr[arr.length-1];
  const p0 = base.price || 0, p1 = last.price || 0;
  if(!p0 || !p1) return 0;
  return (p1/p0 - 1) * 100;
}

// 거래대금 유입률(분당 KRW) 근사치
function inflowRate(code, minutes=3){
  const arr = priceHist[code]; if(!arr || arr.length < 2) return 0;
  const now = Date.now(); const target = now - minutes*60*1000;
  let base = arr[0]; for(let i=0;i<arr.length;i++){ if(arr[i].t >= target){ base = arr[i]; break; } }
  const last = arr[arr.length-1];
  const dv = (last.acc - base.acc); // 24h 누적의 증가분
  const dtMin = Math.max(0.1, (last.t - base.t)/60000);
  return dv / dtMin; // KRW per minute
}

// 간단한 AI 점수(휴리스틱)
function pumpScore(pc1, pc3, pc5, inflow){
  let s = 0;
  // 속도 가점
  s += Math.max(0, pc1) * 2.2;
  s += Math.max(0, pc3) * 1.4;
  s += Math.max(0, pc5) * 1.0;
  // 거래대금 유입 가점 (규모 정규화)
  const inflowBn = inflow / 1_000_000_000; // 억/십억 단위 보정
  s += Math.min(5, inflowBn * 1.8);
  // 과도 급등 페널티(휘발성)
  if (pc1 > 7 && pc3 < 9) s -= 2.0;
  return s;
}

function pumpLevel(score, pc5){
  if (score >= 18 || pc5 >= 10) return {label:'초급등', cls:'lvl-hyper'};
  if (score >= 9  || pc5 >= 5 ) return {label:'급등',   cls:'lvl-pump'};
  return {label:'예열', cls:'lvl-warm'};
}

// 렌더
function renderPumpTable(rows){
  const tbody = document.getElementById('pump-body'); if(!tbody) return;
  if (!rows.length){ tbody.innerHTML = `<tr><td colspan="9">감지 없음</td></tr>`; return; }
  tbody.innerHTML = '';
  rows.forEach((r,idx)=>{
    const info = codeMap[r.code] || {korean_name:r.code.split('-')[1], english_name:''};
    const lv = pumpLevel(r.score, r.pc5);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${idx+1}</td>
      <td>${r.code.replace(baseMarket+'-','')}</td>
      <td>${info.korean_name}</td>
      <td>${fmtKRW(r.price)}</td>
      <td class="${r.pc1>=0?'up':'down'}">${r.pc1.toFixed(2)}%</td>
      <td class="${r.pc3>=0?'up':'down'}">${r.pc3.toFixed(2)}%</td>
      <td class="${r.pc5>=0?'up':'down'}">${r.pc5.toFixed(2)}%</td>
      <td>${Math.round(r.inflow).toLocaleString('ko-KR')} KRW/분</td>
      <td><span class="lvl-badge ${lv.cls}">${lv.label}</span></td>
    `;
    tr.style.cursor='pointer';
    tr.onclick = ()=> selectCode(r.code);
    tbody.appendChild(tr);
  });
}

// 메인 스캐너 (5초마다 호출)
function runPumpScanner(tmap){
  // 1) 히스토리 기록
  recordHistoryFromTickerMap(tmap);

  // 2) 후보 계산
  const now = Date.now();
  const out = [];
  Object.keys(tmap).forEach(code=>{
    // 최신 지표
    const price = tmap[code].trade_price;
    const pc1 = percentChange(code, 1);
    const pc3 = percentChange(code, 3);
    const pc5 = percentChange(code, 5);
    const inflow = inflowRate(code, 3);

    // 3) 필터: (3분≥3% & 1분≥1.5%) 또는 5분≥5%, + 거래대금 유입 양수
    const pass = ((pc3>=3 && pc1>=1.5) || pc5>=5) && inflow > 0;
    if (!pass) return;

    const score = pumpScore(pc1, pc3, pc5, inflow);
    out.push({ code, price, pc1, pc3, pc5, inflow, score });
  });

  // 4) 정렬 및 상위 노출
  out.sort((a,b)=>{
    if (b.score !== a.score) return b.score - a.score;
    if (b.pc3   !== a.pc3  ) return b.pc3   - a.pc3;
    return b.inflow - a.inflow;
  });

  renderPumpTable(out.slice(0, 20));
}
