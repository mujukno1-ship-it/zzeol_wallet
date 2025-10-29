/* =========================================================
   사토시의지갑 v12 — 메모리 통합 프론트 (3단계 분할 한방)
   - config.json에서 API_BASE/No-Motion/UI 설정 읽어옴
   - 업비트 호가틱 반올림, 한글명, KRW
   - SPARK TOP10 + ULTRA 시그널 + 쩔어멘트(불장/하락/되돌림)
   - Precision Boost(±0.3% 자동 보정) 기본 반영
========================================================= */

const S = {
  cfg: null,
  markets: [],
  marketsByCode: {},
  selected: null
};

const $ = (sel) => document.querySelector(sel);
const el = {
  spark: $("#spark"),
  sparkEmpty: $("#sparkEmpty"),
  res: $("#results"),
  resEmpty: $("#resEmpty"),
  q: $("#q"),
  btnSearch: $("#btnSearch"),
  ultraMarket: $("#ultraMarket"),
  now: $("#now"),
  risk: $("#risk"),
  buy1: $("#buy1"),
  buy2: $("#buy2"),
  tp1: $("#tp1"),
  tp2: $("#tp2"),
  sl: $("#sl"),
  ment: $("#ment")
};

/* ---------- 유틸 ---------- */
function fmtKRW(n){ if(n==null || isNaN(n)) return "-"; return Number(n).toLocaleString("ko-KR")+"원"; }
function setText(elm, v){ if(!elm) return; if(S.cfg?.noMotion){ if(elm.textContent!==String(v)) elm.textContent=String(v); } else elm.textContent=String(v); }

/* 업비트 호가틱 */
function upbitTick(p){
  p=Number(p);
  if(p>=2000000) return 1000;
  if(p>=1000000) return 500;
  if(p>=500000)  return 100;
  if(p>=100000)  return 50;
  if(p>=10000)   return 10;
  if(p>=1000)    return 1;
  if(p>=100)     return 0.1;
  if(p>=10)      return 0.01;
  return 0.001;
}
function roundTick(p){ const t=upbitTick(p); return Math.round(Number(p)/t)*t; }

async function jget(path, params){
  const base = S.cfg?.API_BASE || "";
  const url = new URL(base + path);
  if(params) Object.entries(params).forEach(([k,v])=>url.searchParams.set(k,v));
  const r = await fetch(url, { cache: "no-store" });
  if(!r.ok) throw new Error("HTTP "+r.status);
  const j = await r.json();
  if(j && j.ok===false) throw new Error(j.error || "api error");
  return j;
}

/* ---------- 초기화 ---------- */
async function loadConfig(){
  const r = await fetch("/config.json", { cache:"no-store" });
  S.cfg = await r.json();
}
async function loadMarkets(){
  // 백엔드 v12: /upbit/markets (또는 /markets) 둘 다 대응
  let data;
  try { data = await jget("/upbit/markets"); }
  catch { data = await jget("/markets"); }
  const items = data.items || [];
  S.markets = items.filter(x=>/^KRW-/.test(x.market));
  S.marketsByCode = Object.fromEntries(S.markets.map(x=>[x.market,x]));
}

async function loadSpark(){
  try{
    const j = await jget("/spark/top10");
    renderSpark(j.items||[]);
  }catch{
    renderSpark([]);
  }
}
function renderSpark(items){
  el.spark.innerHTML = "";
  if(!items.length){ el.sparkEmpty.style.display="block"; return; }
  el.sparkEmpty.style.display="none";
  for(const it of items){
    const name = it.korean_name || S.marketsByCode[it.market]?.korean_name || it.market;
    const score = Math.round((it.spark_score ?? it.score ?? 0));
    const row = document.createElement("div");
    row.className = "item";
    row.innerHTML = `
      <div>
        <b>${name}</b>
        <div class="weak" style="margin-top:2px">${it.market} · 예열강도 ${isNaN(score)?'-':score}</div>
      </div>
      <button class="btn" data-market="${it.market}">선택</button>
    `;
    row.querySelector("button").onclick = ()=>selectMarket(it.market, name);
    el.spark.appendChild(row);
  }
}

/* 검색 */
function doSearch(){
  const q = (el.q.value||"").trim().toLowerCase();
  const max = S.cfg?.ui?.maxSearchResults ?? 5;
  if(!q){ renderResults([]); return; }
  const list = S.markets.filter(x =>
    x.korean_name?.toLowerCase().includes(q) ||
    x.english_name?.toLowerCase().includes(q) ||
    x.market?.toLowerCase().includes(q)
  ).slice(0, max);
  renderResults(list);
}
function renderResults(list){
  el.res.innerHTML = "";
  if(!list.length){
    el.resEmpty.textContent="검색 결과 없음.";
    el.resEmpty.style.display="block";
    return;
  }
  el.resEmpty.style.display="none";
  for(const it of list){
    const row = document.createElement("div");
    row.className="item";
    row.innerHTML = `
      <div>
        <b>${it.korean_name}</b>
        <div class="weak" style="margin-top:2px">${it.market} · ${it.english_name||""}</div>
      </div>
      <button class="btn" data-market="${it.market}">선택</button>
    `;
    row.querySelector("button").onclick=()=>selectMarket(it.market,it.korean_name);
    el.res.appendChild(row);
  }
}

/* ULTRA */
async function selectMarket(market, nameText){
  S.selected = market;
  try{
    const sig = await jget("/ultra/signal",{market});
    renderUltra(sig, nameText);
  }catch(e){
    renderUltra({market,price:0,risk:"-",buy1:0,buy2:0,tp1:0,tp2:0,sl:0,comment:"연동 실패"}, nameText);
  }
}
function applyPrecisionBoost(v){
  if(!S.cfg?.precisionBoost?.enabled) return v;
  const tol = (S.cfg.precisionBoost.tolerancePct ?? 0)/100;
  return roundTick(v*(1+Math.sign(v)*tol));
}
function buildMent(sig, modeHint){
  // 사토시 메모리 기반 간단 멘트 생성
  const up = sig.expected_up_pct, down = sig.expected_down_pct;
  const fi = sig.ForceIndex_AI ?? sig.forceIndex ?? sig.forceindex;
  if(modeHint==="bull" || (fi>=80 && up>=10)) return `🔥 세력 분출 직전 — 예열강도 ${Math.round(sig.spark_score||fi||0)} / 상승확률 높음 / 예상상승률 +${up||'?'}%`;
  if(modeHint==="bear" || (fi<=35 && down>=5)) return `⚠️ 하락 위험 — 빠른 청산 권장 / 예상하락률 -${down||'?'}%`;
  return `↔️ 되돌림 — 분할진입 1차 / 예상상승률 +${up??'?'}%, 하락률 -${down??'?'}%`;
}
function renderUltra(sig, nameText){
  const m = sig.market;
  const nm = nameText || S.marketsByCode[m]?.korean_name || m;
  setText(el.ultraMarket, `${nm} (${m})`);

  const now = sig.price || 0;
  const risk = sig.risk ?? 3;

  // 서버가 값(가격/TP/SL)을 안 줄 때 대비 — 로컬 계산(있으면 그대로 사용)
  let buy1 = sig.buy1, buy2 = sig.buy2, tp1 = sig.tp1, tp2 = sig.tp2, sl = sig.sl;
  if(now>0){
    const upPct = sig.expected_up_pct ?? 8;
    const dnPct = sig.expected_down_pct ?? 4;
    if(!tp1) tp1 = roundTick(now*(1+upPct/100*0.6));
    if(!tp2) tp2 = roundTick(now*(1+upPct/100));
    if(!sl)  sl  = roundTick(now*(1-dnPct/100));
    if(!buy1) buy1 = roundTick(now*(1-dnPct/100*0.4));
    if(!buy2) buy2 = roundTick(now*(1-dnPct/100*0.8));
  }

  // Precision Boost ±0.3% 보정
  if(tp1) tp1 = applyPrecisionBoost(tp1);
  if(tp2) tp2 = applyPrecisionBoost(tp2);
  if(sl)  sl  = applyPrecisionBoost(sl);
  if(buy1)buy1= applyPrecisionBoost(buy1);
  if(buy2)buy2= applyPrecisionBoost(buy2);

  setText(el.now,  now?fmtKRW(now):"-");
  setText(el.risk, String(risk));
  setText(el.buy1, buy1?fmtKRW(buy1):"-");
  setText(el.buy2, buy2?fmtKRW(buy2):"-");
  setText(el.tp1,  tp1?fmtKRW(tp1):"-");
  setText(el.tp2,  tp2?fmtKRW(tp2):"-");
  setText(el.sl,   sl ?fmtKRW(sl):"-");

  // 쩔어한마디 (모드 코멘트)
  let mode = sig.mode || (sig.ForceIndex_AI>=80 ? "bull" : (sig.ForceIndex_AI<=35 ? "bear" : "pullback"));
  const ment = sig.comment || buildMent(sig, mode);
  setText(el.ment, ment);
}

/* ---------- 부팅 ---------- */
async function boot(){
  await loadConfig();
  // 헬스체크는 선택
  try { await jget("/health"); } catch {}
  await loadMarkets();
  await loadSpark();

  el.btnSearch.addEventListener("click", doSearch);
  el.q.addEventListener("keydown", e=>{ if(e.key==="Enter") doSearch(); });

  // SPARK 첫 항목 자동 선택 (있을 때)
  const firstBtn = el.spark?.querySelector("button[data-market]");
  if(firstBtn) firstBtn.click();

  // 주기 갱신 (가볍게)
  setInterval(loadSpark, 30_000);
  setInterval(()=>{ if(S.selected) selectMarket(S.selected); }, 20_000);
}
boot();
