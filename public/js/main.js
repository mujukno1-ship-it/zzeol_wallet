/* 사토시의지갑 v13 — 업비트 저가코인 호가틱 완전정확 버전 */
const API = ()=> window.API_BASE;
const $ = s => document.querySelector(s);
const el = {
  q:$("#q"), btn:$("#btnSearch"),
  spark:$("#spark"), sparkEmpty:$("#sparkEmpty"),
  res:$("#results"), resEmpty:$("#resEmpty"),
  ultraMarket:$("#ultraMarket"),
  now:$("#now"), risk:$("#risk"),
  buy1:$("#buy1"), buy2:$("#buy2"),
  tp1:$("#tp1"), tp2:$("#tp2"), sl:$("#sl"),
  xpct:$("#xpct"), ment:$("#ment")
};

let MARKETS=[], SELECTED=null;

// === 업비트 KRW 호가틱 (초저가 완벽 반영) ===
function tickKRW(p){
  p = Number(p);
  const a = Math.abs(p);

  if (a >= 2_000_000) return 1000;
  if (a >= 1_000_000) return 500;
  if (a >=   500_000) return 100;
  if (a >=   100_000) return 50;
  if (a >=    10_000) return 10;
  if (a >=     1_000) return 5;
  if (a >=       100) return 1;
  if (a >=        10) return 0.1;
  if (a >=         1) return 0.01;
  if (a >=       0.1) return 0.001;
  if (a >=      0.01) return 0.0001;
  if (a >=     0.001) return 0.00005;  // ⬅ 시바이누 완벽 대응
  return 0.00001;                      // ⬅ 극저가 방어
}
function roundDownTick(p){
  const t=tickKRW(p);
  const r=Math.floor(Number(p)/t)*t;
  return t>=1? String(r.toFixed(0)) : String(r.toFixed(String(t).split(".")[1].length));
}
function roundUpTick(p){
  const t=tickKRW(p);
  const r=Math.ceil(Number(p)/t)*t;
  return t>=1? String(r.toFixed(0)) : String(r.toFixed(String(t).split(".")[1].length));
}

// === KRW 표기 (저가 자리수 자동 맞춤) ===
const KRW = (n)=>{
  if(n==null||isNaN(n))return"-";
  const v=Number(n), a=Math.abs(v);
  if(a<1){
    const t=tickKRW(v);
    const dec=String(t).includes(".")?String(t).split(".")[1].length:0;
    return `${v.toFixed(dec)}원`;
  }
  return `${v.toLocaleString("ko-KR")}원`;
};
const setText=(node,val)=>{const s=String(val);if(node.textContent!==s)node.textContent=s;};

// === 공용 fetch ===
async function jget(path){
  const url=`${API()}${path}`;
  for(let i=0;i<3;i++){
    try{
      const ctrl=new AbortController();
      const t=setTimeout(()=>ctrl.abort(),3000);
      const r=await fetch(url,{cache:"no-store",signal:ctrl.signal});
      clearTimeout(t);
      const j=await r.json();
      if(j&&j.ok!==false)return j;
      throw new Error(j?.error||`HTTP ${r.status}`);
    }catch(e){if(i===2)throw e;}
  }
}

// === 부트 ===
async function boot(){
  try{
    const m=await jget("/markets");
    MARKETS=(m.items||[]).filter(x=>/^KRW-/.test(x.market));
  }catch{MARKETS=[];}

  loadSpark();
  el.btn.addEventListener("click",doSearch);
  el.q.addEventListener("keydown",e=>{if(e.key==="Enter")doSearch();});
  setInterval(()=>loadSpark(),30000);
  setInterval(()=>{if(SELECTED)select(SELECTED);},20000);
}

// === SPARK ===
async function loadSpark(){
  try{
    const s=await jget("/spark/top10");
    renderSpark(s.items||[]);
  }catch{renderSpark([]);}
}
function renderSpark(items){
  el.spark.innerHTML="";
  if(!items.length){el.sparkEmpty.style.display="block";return;}
  el.sparkEmpty.style.display="none";
  for(const it of items){
    const name=it.korean_name||it.market;
    const score=Math.round(it.spark_score??it.score??0);
    const row=document.createElement("div");
    row.className="item";
    row.innerHTML=`
      <div><b>${name}</b>
      <div class="weak mt2">${it.market} · 예열강도 ${isNaN(score)?'-':score}</div></div>
      <button class="btn" data-m="${it.market}">선택</button>`;
    row.querySelector("button").onclick=()=>select(it.market,name);
    el.spark.appendChild(row);
  }
}

// === 검색 (5개) ===
function doSearch(){
  const q=(el.q.value||"").trim().toLowerCase();
  if(!q){renderResults([]);return;}
  const hits=MARKETS.filter(x=>
    x.korean_name?.toLowerCase().includes(q)||
    x.english_name?.toLowerCase().includes(q)||
    x.market?.toLowerCase().includes(q)
  ).slice(0,5);
  renderResults(hits);
}
function renderResults(list){
  el.res.innerHTML="";
  if(!list.length){el.resEmpty.textContent="검색 결과 없음.";el.resEmpty.style.display="block";return;}
  el.resEmpty.style.display="none";
  for(const it of list){
    const row=document.createElement("div");
    row.className="item";
    row.innerHTML=`
      <div><b>${it.korean_name}</b>
      <div class="weak mt2">${it.market} · ${it.english_name||""}</div></div>
      <button class="btn" data-m="${it.market}">선택</button>`;
    row.querySelector("button").onclick=()=>select(it.market,it.korean_name);
    el.res.appendChild(row);
  }
}

// === ULTRA ===
async function select(market,nameText){
  SELECTED=market;
  try{
    const sig=await jget(`/ultra/signal?market=${encodeURIComponent(market)}`);
    applyUltra(sig,market,nameText);
  }catch{
    applyUltra({market,price:0,risk:"-",buy1:0,buy2:0,tp1:0,tp2:0,sl:0,comment:"연동 실패"},market,nameText);
  }
}
function applyUltra(sig,market,nameText){
  setText(el.ultraMarket,`${nameText||market} (${market})`);
  const now=Number(sig.price||0);
  const up=Number(sig.expected_up_pct??8);
  const dn=Number(sig.expected_down_pct??4);

  let buy1=sig.buy1,buy2=sig.buy2,tp1=sig.tp1,tp2=sig.tp2,sl=sig.sl;
  if(now>0){
    if(!tp1)tp1=roundUpTick(now*(1+up/100*0.6));
    if(!tp2)tp2=roundUpTick(now*(1+up/100));
    if(!sl) sl= roundDownTick(now*(1-dn/100));
    if(!buy1)buy1=roundDownTick(now*(1-dn/100*0.4));
    if(!buy2)buy2=roundDownTick(now*(1-dn/100*0.8));
  }

  setText(el.now,now?KRW(now):"-");
  setText(el.risk,String(sig.risk??"-"));
  setText(el.buy1,buy1?KRW(buy1):"-");
  setText(el.buy2,buy2?KRW(buy2):"-");
  setText(el.tp1,tp1?KRW(tp1):"-");
  setText(el.tp2,tp2?KRW(tp2):"-");
  setText(el.sl,sl?KRW(sl):"-");
  setText(el.xpct,`+${up}% / -${dn}%`);

  const fi=sig.ForceIndex_AI??0;
  let ment=sig.comment;
  if(!ment){
    if(fi>=80) ment=`🔥 불장 — 예열강도 ${Math.round(fi)} / 상승률 +${up}%`;
    else if(fi<=35) ment=`⚠️ 하락장 — 하락률 -${dn}% / 빠른 청산`;
    else ment=`↔️ 되돌림 — 분할진입 1차 / +${up}%, -${dn}%`;
  }
  setText(el.ment,ment);
}

boot();
