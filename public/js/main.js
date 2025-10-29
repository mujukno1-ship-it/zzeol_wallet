/* 사토시의지갑 v13 — 프론트(연동안끊김)
   - API_BASE는 index.html에서 window.API_BASE로 주입
   - 업비트 호가틱/한글/No-Motion, 검색(5개), SPARK, ULTRA, 쩔어멘트 기본
*/
const API = () => window.API_BASE;
const $ = (s)=>document.querySelector(s);
const el = {
  q:$("#q"), btn:$("#btnSearch"),
  spark:$("#spark"), sparkEmpty:$("#sparkEmpty"),
  res:$("#results"), resEmpty:$("#resEmpty"),
  ultraMarket:$("#ultraMarket"),
  now:$("#now"), risk:$("#risk"), buy1:$("#buy1"), buy2:$("#buy2"),
  tp1:$("#tp1"), tp2:$("#tp2"), sl:$("#sl"), ment:$("#ment")
};

let MARKETS=[], SELECTED=null;

// 업비트 호가틱
function tick(p){
  p=Number(p); const a=Math.abs(p);
  if(a>=2_000_000) return 1000;
  if(a>=1_000_000) return 500;
  if(a>=  500_000) return 100;
  if(a>=  100_000) return 50;
  if(a>=   10_000) return 10;
  if(a>=    1_000) return 5;
  if(a>=      100) return 1;
  if(a>=       10) return 0.1;
  if(a>=        1) return 0.01;
  return 0.001;
}
function roundTick(p){const t=tick(p);const r=Math.round(Number(p)/t)*t;return t>=1?String(r.toFixed(0)):String(r.toFixed(String(t).split(".")[1].length));}
const KRW = (n)=> (n==null||isNaN(n))? "-" : `${Number(n).toLocaleString("ko-KR")}원`;
const setText=(node,val)=>{ if(node.textContent!==String(val)) node.textContent=String(val); };

// 공용 fetch (3초 타임아웃 + 2회 재시도)
async function jget(path){
  const url = `${API()}${path}`;
  for(let i=0;i<3;i++){
    try{
      const ctrl = new AbortController();
      const t = setTimeout(()=>ctrl.abort(), 3000);
      const r = await fetch(url,{cache:"no-store",signal:ctrl.signal});
      clearTimeout(t);
      const j = await r.json();
      if(j && j.ok!==false) return j;
      throw new Error(j?.error||`HTTP ${r.status}`);
    }catch(e){ if(i===2) throw e; }
  }
}

// 초기화
async function boot(){
  // markets
  try{
    const m = await jget("/markets");
    MARKETS = (m.items||[]).filter(x=>/^KRW-/.test(x.market));
  }catch{ MARKETS=[]; }

  // spark
  loadSpark();

  // events
  el.btn.addEventListener("click", doSearch);
  el.q.addEventListener("keydown",(e)=>{ if(e.key==="Enter") doSearch(); });

  // auto-refresh (끊김 방지)
  setInterval(()=>{ loadSpark(); }, 30000);
  setInterval(()=>{ if(SELECTED) select(SELECTED); }, 20000);
}

async function loadSpark(){
  try{
    const s = await jget("/spark/top10");
    renderSpark(s.items||[]);
  }catch{
    renderSpark([]); // 실패해도 화면 유지
  }
}
function renderSpark(items){
  el.spark.innerHTML = "";
  if(!items.length){ el.sparkEmpty.style.display="block"; return; }
  el.sparkEmpty.style.display="none";
  for(const it of items){
    const name = it.korean_name || it.market;
    const score = Math.round(it.spark_score ?? it.score ?? 0);
    const row = document.createElement("div");
    row.className="item";
    row.innerHTML=`<div><b>${name}</b><div class="weak" style="margin-top:2px">${it.market} · 예열강도 ${isNaN(score)?'-':score}</div></div>
                   <button class="btn" data-m="${it.market}">선택</button>`;
    row.querySelector("button").onclick=()=>{ select(it.market, name); };
    el.spark.appendChild(row);
  }
}

function doSearch(){
  const q=(el.q.value||"").trim().toLowerCase();
  if(!q){ renderResults([]); return; }
  const hits = MARKETS.filter(x =>
    x.korean_name?.toLowerCase().includes(q) ||
    x.english_name?.toLowerCase().includes(q) ||
    x.market?.toLowerCase().includes(q)
  ).slice(0,5);
  renderResults(hits);
}
function renderResults(list){
  el.res.innerHTML="";
  if(!list.length){ el.resEmpty.textContent="검색 결과 없음."; el.resEmpty.style.display="block"; return; }
  el.resEmpty.style.display="none";
  for(const it of list){
    const row=document.createElement("div");
    row.className="item";
    row.innerHTML=`<div><b>${it.korean_name}</b><div class="weak" style="margin-top:2px">${it.market} · ${it.english_name||""}</div></div>
                   <button class="btn" data-m="${it.market}">선택</button>`;
    row.querySelector("button").onclick=()=>{ select(it.market, it.korean_name); };
    el.res.appendChild(row);
  }
}

async function select(market, nameText){
  SELECTED = market;
  try{
    const sig = await jget(`/ultra/signal?market=${encodeURIComponent(market)}`);
    applyUltra(sig, market, nameText);
  }catch{
    applyUltra({market,price:0,risk:"-",buy1:0,buy2:0,tp1:0,tp2:0,sl:0,comment:"연동 실패"}, market, nameText);
  }
}
function applyUltra(sig, market, nameText){
  setText(el.ultraMarket, `${nameText || market} (${market})`);
  const now = sig.price || 0;
  let buy1=sig.buy1, buy2=sig.buy2, tp1=sig.tp1, tp2=sig.tp2, sl=sig.sl;

  // (서버 미제공 시) 예상 퍼센트로 로컬 계산
  if(now>0){
    const up = sig.expected_up_pct ?? 8, dn = sig.expected_down_pct ?? 4;
    if(!tp1) tp1 = roundTick(now*(1+up/100*0.6));
    if(!tp2) tp2 = roundTick(now*(1+up/100));
    if(!sl)  sl  = roundTick(now*(1-dn/100));
    if(!buy1)buy1= roundTick(now*(1-dn/100*0.4));
    if(!buy2)buy2= roundTick(now*(1-dn/100*0.8));
  }

  setText(el.now,  now?KRW(now):"-");
  setText(el.risk, String(sig.risk ?? "-"));
  setText(el.buy1, buy1?KRW(buy1):"-");
  setText(el.buy2, buy2?KRW(buy2):"-");
  setText(el.tp1,  tp1?KRW(tp1):"-");
  setText(el.tp2,  tp2?KRW(tp2):"-");
  setText(el.sl,   sl ?KRW(sl):"-");

  const fi = sig.ForceIndex_AI ?? 0, upPct=sig.expected_up_pct??8, dnPct=sig.expected_down_pct??4;
  let ment = sig.comment;
  if(!ment){
    if(fi>=80) ment = `🔥 불장 — 예열강도 ${fi} / 상승률 +${upPct}%`;
    else if(fi<=35) ment = `⚠️ 하락장 — 하락률 -${dnPct}% / 빠른 청산`;
    else ment = `↔️ 되돌림 — 분할진입 1차 / +${upPct}%, -${dnPct}%`;
  }
  setText(el.ment, ment);
}

boot();
