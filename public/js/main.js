/* -------------------------------------------------------
 * 사토시의지갑 v10.5 Main — SPARK + Search + ULTRA + KRW Tick
 * 기존 HTML의 다음 ID를 사용합니다:
 * #api-url, #q, #spark, #ul-name, #ul-price, #ul-buy1, #ul-buy2, #ul-tp1, #ul-tp2, #ul-sl,
 * #pill-score, #pill-prob, #pill-rise, #pill-risk, #ment
 * ----------------------------------------------------- */

/* ========== 환경설정 ========== */
const CONFIG = {
  API_BASE: "https://satoshi-proxy.mujukno1.workers.dev/api",
  SPARK_WINDOW: "5m",
  SPARK_LIMIT: 10,
  REFRESH_MS: 5000,
  FETCH_TIMEOUT_MS: 6000,
  RETRIES: 2
};
const API_NOTE = document.getElementById("api-url");
if (API_NOTE) API_NOTE.textContent = CONFIG.API_BASE;

/* ========== 업비트 KRW 호가틱 (저가코인 완전대응) ========== */
function krwTickStep(p){
  if (p >= 2000000) return 1000;
  if (p >= 1000000) return 500;
  if (p >= 500000)  return 100;
  if (p >= 100000)  return 50;
  if (p >= 10000)   return 10;
  if (p >= 1000)    return 1;
  if (p >= 100)     return 0.1;
  if (p >= 10)      return 0.01;
  if (p >= 1)       return 0.001;   // 시바이누 등 저가
  if (p >= 0.1)     return 0.0001;
  return 0.00001;
}
function roundTick(p){
  const step = krwTickStep(p);
  const r = Math.round(p / step) * step;
  const d = (step.toString().split('.')[1] || '').length;
  return Number(r.toFixed(d));
}
function fmtKRW(v){
  if (!isFinite(v)) return "-";
  const step = krwTickStep(v);
  const d = (step.toString().split(".")[1] || "").length;
  if (v >= 1000) return Math.round(v).toLocaleString("ko-KR") + "원";
  return v.toFixed(d) + "원";
}

/* ========== 공용 fetch 유틸(타임아웃+재시도) ========== */
async function fetchJSON(url, {timeout=CONFIG.FETCH_TIMEOUT_MS, retries=CONFIG.RETRIES}={}){
  for (let i=0;i<=retries;i++){
    const ctrl = new AbortController();
    const t = setTimeout(()=>ctrl.abort(), timeout);
    try{
      const r = await fetch(url, {signal: ctrl.signal});
      clearTimeout(t);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.json();
    }catch(e){
      clearTimeout(t);
      if (i===retries) throw e;
      await new Promise(res=>setTimeout(res, 250)); // 짧은 백오프
    }
  }
}

/* ========== 한글 코인명 동적 로딩(부족분 보강) ========== */
const NAME_STATIC = {
  "KRW-SHIB":"시바이누","KRW-BTC":"비트코인","KRW-ETH":"이더리움","KRW-XRP":"리플",
  "KRW-DOGE":"도지코인","KRW-SOL":"솔라나","KRW-CHZ":"칠리즈","KRW-ONDO":"온도",
  "KRW-FIL":"파일코인","KRW-BAT":"베이직어텐션토큰","KRW-WAVES":"웨이브"
};
let NAME = {...NAME_STATIC};
async function loadKoreanNames(){
  try{
    const arr = await fetchJSON("https://api.upbit.com/v1/market/all?isDetails=true",{timeout:8000,retries:1});
    arr.filter(x=>x.market?.startsWith("KRW-"))
       .forEach(x=> NAME[x.market] = x.korean_name);
  }catch(_){ /* 실패해도 STATIC으로 동작 */ }
}

/* ========== 상태 ========== */
let TICKERS = new Map();   // market -> { price }
let LAST_SPARK = [];       // [{market, score, rvol, tbr, obi, ...}]

/* ========== 데이터 로딩 ========== */
async function fetchTickers(){
  const data = await fetchJSON(`${CONFIG.API_BASE}/upbit/tickers`);
  const m = new Map();
  for (const t of data){ m.set(t.market, {price: Number(t.tradePrice)||0}); }
  TICKERS = m;
}

async function fetchSparkTop(){
  // 서로 다른 워커 버전을 대비해 3개 엔드포인트 순차 시도
  const candidates = [
    `${CONFIG.API_BASE}/spark/top?window=${CONFIG.SPARK_WINDOW}&limit=${CONFIG.SPARK_LIMIT}`,
    `${CONFIG.API_BASE}/spark?window=${CONFIG.SPARK_WINDOW}&limit=${CONFIG.SPARK_LIMIT}`,
    `${CONFIG.API_BASE}/spark`
  ];
  let data = [];
  let lastErr = null;
  for (const url of candidates){
    try{
      const res = await fetchJSON(url);
      data = Array.isArray(res) ? res : (res.data||[]);
      if (Array.isArray(data) && data.length>=0) break;
    }catch(e){ lastErr = e; }
  }
  if (!Array.isArray(data)) throw lastErr || new Error("SPARK format error");
  LAST_SPARK = data;
  return data;
}

/* ========== 시그널/멘트/타점 계산 ========== */
function expectedRise(score){
  if (score>=90) return 0.21; // 15~25% 중간치
  if (score>=80) return 0.10; // 8~12%
  if (score>=70) return 0.05; // 4~6%
  return 0.02;
}
function riseProb(score){
  if (score>=90) return 0.88;
  if (score>=80) return 0.72;
  if (score>=70) return 0.60;
  return 0.45;
}
function riskLevel(score){ return (score>=70? (score>=80?2:3):4); }

function buildMent(item){
  const { score, rvol=0, tbr=0, obi=0, market } = item;
  const name = NAME[market] || market.replace("KRW-","");
  if (score>=90) return `🔥 세력 분출 직전 — ${name} 예열강도 ${score} / 상승확률 ${(riseProb(score)*100|0)}% / 예상상승률 +${(expectedRise(score)*100).toFixed(1)}%`;
  if (score>=80) return `⚡ 강력 예열 — ${name} 모멘텀 우세(TBR ${(tbr*100).toFixed(0)}%) · RVOL ${rvol.toFixed(2)} · 예열강도 ${score}`;
  if (score>=70) return `🟡 예열 진행 — ${name} 관망 또는 소량 분할 진입 권장 (OBI ${(obi*100).toFixed(0)}%)`;
  return `🔵 대기 — 신호 약함. 조건 충족 대기 권장`;
}

function buildTargets(cur, score){
  const tp1P = (score>=90? 0.016 : score>=80? 0.012 : 0.008);
  const tp2P = (score>=90? 0.028 : score>=80? 0.020 : 0.014);
  const slP  = (score>=90? -0.008 : score>=80? -0.010 : -0.012);
  const buy1 = roundTick(cur * (1 - 0.003));
  const buy2 = roundTick(cur * (1 - 0.008));
  const tp1  = roundTick(cur * (1 + tp1P));
  const tp2  = roundTick(cur * (1 + tp2P));
  const sl   = roundTick(cur * (1 + slP));
  return {buy1, buy2, tp1, tp2, sl};
}

/* ========== 렌더링 (No-Motion 부분패치) ========== */
const $spark = document.getElementById("spark");
const $q = document.getElementById("q");
function renderSpark(list){
  if (!$spark) return;
  if (!list.length){
    $spark.innerHTML = `<div style="padding:12px;border:1px dashed #2c3d52;border-radius:10px;color:#9fb2c8">SPARK 데이터가 없습니다. 잠시 후 자동 재시도됩니다.</div>`;
    return;
  }
  $spark.innerHTML = list.slice(0, CONFIG.SPARK_LIMIT).map(item=>{
    const price = TICKERS.get(item.market)?.price || 0;
    const kname = NAME[item.market] || item.market.split('-')[1];
    const score = item.score|0;
    const w = Math.min(100, Math.max(0, score));
    const hot = score>=90 ? 'style="background:#9b1c1c;border-color:#9b1c1c;color:#fff"' : "";
    return `
      <div class="coin" data-market="${item.market}">
        <div class="row" style="justify-content:space-between">
          <div>
            <div class="sym">${item.market}</div>
            <div class="kname">${kname}</div>
          </div>
          <div class="price">${price? fmtKRW(roundTick(price)) : '-'}</div>
        </div>
        <div class="bar"><i style="width:${w}%"></i></div>
        <div class="row" style="margin-top:4px;gap:6px;flex-wrap:wrap">
          <span class="pill" ${hot}>SPARK ${score}</span>
          <span class="pill">RVOL ${item.rvol?.toFixed(2) ?? '-'}</span>
          <span class="pill">TBR ${(item.tbr*100).toFixed(0)}%</span>
        </div>
      </div>`;
  }).join("");

  $spark.querySelectorAll(".coin").forEach(el=>{
    el.onclick = ()=>{
      const m = el.getAttribute("data-market");
      const item = LAST_SPARK.find(x=>x.market===m);
      selectUltra(item);
    };
  });

  // 검색어 없으면 첫 카드 자동 선택
  if (!$q || !$q.value.trim()){
    const first = LAST_SPARK[0];
    if (first) selectUltra(first);
  }
}

function selectUltra(item){
  if (!item) return;
  const price0 = TICKERS.get(item.market)?.price || 0;
  const cur = roundTick(price0);
  const kname = NAME[item.market] || item.market.split("-")[1];

  const byId = id => document.getElementById(id);
  byId("ul-name").textContent = `${kname} (${item.market})`;
  byId("ul-price").textContent = fmtKRW(cur);

  const {buy1,buy2,tp1,tp2,sl} = buildTargets(cur, item.score|0);
  byId("ul-buy1").textContent = fmtKRW(buy1);
  byId("ul-buy2").textContent = fmtKRW(buy2);
  byId("ul-tp1").textContent  = fmtKRW(tp1);
  byId("ul-tp2").textContent  = fmtKRW(tp2);
  byId("ul-sl").textContent   = fmtKRW(sl);

  const prob = Math.round(riseProb(item.score)*100);
  const rise = Math.round(expectedRise(item.score)*1000)/10;
  byId("pill-score").textContent = `예열강도 ${item.score|0}`;
  byId("pill-prob").textContent  = `상승확률 ${prob}%`;
  byId("pill-rise").textContent  = `예상상승률 +${rise}%`;
  byId("pill-risk").textContent  = `위험도 ${riskLevel(item.score)}`;

  byId("ment").textContent = buildMent(item);
}

/* ========== 검색(한글/영문 모두, 자동선택) ========== */
let SPARK_CACHE = [];
function cacheSparkCards(){
  if (!$spark) return;
  const cards = $spark.querySelectorAll('[data-market], .coin');
  SPARK_CACHE = Array.from(cards).map(el=>{
    const market = el.getAttribute('data-market') || (el.querySelector('.sym')?.textContent?.trim()) || '';
    const kname  = (el.querySelector('.kname')?.textContent?.trim()) || '';
    return { el, market, kname, text: `${market} ${kname}`.toLowerCase() };
  });
}
function debounce(fn, ms=120){ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), ms); }; }
function showEmptyMsg(msg){
  let box = document.getElementById('empty-msg');
  if (!box){
    box = document.createElement('div');
    box.id = 'empty-msg';
    box.style.textAlign='center'; box.style.color='#9fb2c8';
    box.style.padding='12px'; box.style.border='1px dashed #2c3d52'; box.style.borderRadius='10px';
    $spark.appendChild(box);
  }
  box.textContent = msg;
}
function hideEmptyMsg(){ const box = document.getElementById('empty-msg'); if (box) box.remove(); }

const onSearch = debounce(()=>{
  if (!$q || !$spark) return;
  const q = $q.value.trim().toLowerCase();
  cacheSparkCards();
  if (!q){
    hideEmptyMsg();
    SPARK_CACHE.forEach(({el})=> el.style.display='');
    if (LAST_SPARK[0]) selectUltra(LAST_SPARK[0]);
    return;
  }
  const matched = [];
  SPARK_CACHE.forEach(it=>{
    const ok = it.text.includes(q);
    it.el.style.display = ok ? '' : 'none';
    if (ok) matched.push(it);
  });
  if (!matched.length){
    showEmptyMsg(`❌ '${$q.value}' 결과가 없습니다. (현재 TOP10에 없을 수 있음)`);
  }else{
    hideEmptyMsg();
    // 첫 결과 자동 선택
    const item = LAST_SPARK.find(x=> x.market === matched[0].market);
    if (item) selectUltra(item);
  }
}, 80);
$q?.addEventListener("input", onSearch);

/* ========== 루프(5초) ========== */
async function tick(){
  try{
    await fetchTickers();
    const s = await fetchSparkTop();
    renderSpark(s);
    cacheSparkCards();
  }catch(e){
    // 조용히 재시도
    console.warn("loop error:", e?.message||e);
  }finally{
    setTimeout(tick, CONFIG.REFRESH_MS);
  }
}

/* ========== 시작 ========== */
(async function start(){
  await loadKoreanNames();
  tick();
})();
