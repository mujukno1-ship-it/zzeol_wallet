<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>사토시의지갑 v10.5 — KRW · 업비트 호가틱 · No-Motion</title>
<style>
  :root{
    --bg:#0f1218;--panel:#151a21;--muted:#9aa4b2;--text:#e7eef8;--accent:#5ac8fa;
    --up:#1ec996;--down:#ff5b6b;--chip:#1f2630;--rail:#2a3340;--spark:#ffb020;
  }
  *{box-sizing:border-box}
  html,body{height:100%}
  body{margin:0;background:var(--bg);color:var(--text);font:14px/1.45 system-ui,Segoe UI,Apple SD Gothic Neo,Malgun Gothic,sans-serif}
  .wrap{max-width:1200px;margin:24px auto;padding:0 16px}
  .badge{background:#19202a;color:#9bc3ff;border:1px solid #2a3950;border-radius:10px;padding:4px 8px;font-size:12px}
  .api{margin-left:auto;font-size:12px;color:var(--muted)}
  .search{position:sticky;top:0;background:linear-gradient(180deg,rgba(15,18,24,.95),rgba(15,18,24,.75));
          padding:10px 0 12px;z-index:5;backdrop-filter:saturate(1.2) blur(2px)}
  .row{display:flex;gap:8px;align-items:center}
  .search input{flex:1;background:#11161d;border:1px solid #263246;color:var(--text);
                border-radius:10px;padding:12px 14px;outline:none}
  .search button{background:#1b2533;border:1px solid #2b3a52;color:#d7e6ff;border-radius:10px;padding:10px 14px;cursor:pointer}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:12px}
  @media (max-width:980px){.grid{grid-template-columns:1fr}}
  .card{background:var(--panel);border:1px solid #202734;border-radius:18px;padding:14px}
  .title{display:flex;align-items:center;gap:8px;font-weight:700}
  .title small{margin-left:6px;color:var(--muted);font-weight:500}
  .list{display:grid;gap:10px;margin-top:12px}
  .item{display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center;padding:10px;border-radius:12px;background:#11161d;border:1px solid #1d2633}
  .item .name{display:flex;flex-direction:column}
  .item .name b{font-size:13px}
  .bar{height:6px;background:var(--rail);border-radius:999px;overflow:hidden}
  .bar span{display:block;height:100%;background:var(--spark);width:0%}
  .pillrow{display:flex;gap:6px;flex-wrap:wrap;margin-top:6px}
  .pill{padding:3px 8px;border-radius:999px;background:var(--chip);border:1px solid #273041;font-size:12px;color:#c8d3e2}
  .pill.badge{background:#121820}
  .ultra{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:12px}
  .box{background:#11161d;border:1px solid #1d2633;border-radius:12px;padding:10px;min-height:58px}
  .k{color:var(--muted);font-size:12px}
  .v{font-weight:700;margin-top:2px}
  .note{margin-top:10px;background:#10151c;border:1px dashed #2a3340;border-radius:12px;padding:10px;font-size:13px;color:#dbe8ff}
  footer{margin:18px 0 10px;color:#8fa0b5;font-size:12px;text-align:center}
  .reserve{min-height:320px;display:flex;align-items:center;justify-content:center;color:#6e7a8a}
  /* 검색 드롭다운 */
  #suggest{position:absolute;z-index:9999;background:#111;border:1px solid #333;border-radius:8px;padding:6px 0;display:none}
  #suggest .row{padding:8px 12px;cursor:pointer}
  #suggest .row:hover{background:#1f2937}
</style>
</head>
<body>
<div class="wrap">
  <div class="search">
    <div class="row">
      <span class="badge">KRW · 업비트 호가틱 · 한글명 · No-Motion</span>
      <div class="api">API: <span id="apiBaseTxt">https://satoshi-proxy.mujukno1.workers.dev/api</span></div>
    </div>
    <div class="row" style="margin-top:8px">
      <input id="q" placeholder="검색: 한글명 / 심볼 / 마켓코드 (예: 에이다, ADA, KRW-ADA, 시바이누, SHIB, KRW-SHIB)" />
      <button id="btnSearch">검색</button>
    </div>
  </div>

  <div class="grid">
    <!-- SPARK -->
    <section class="card" id="sparkCard">
      <div class="title">SPARK TOP10 — 급등 전 예열코인 🔥 <small>(고정)</small></div>
      <div class="pillrow" style="margin-top:8px">
        <span class="pill badge">예열 조건: RVOL≥1.8 · TBR≥0.60 · OBI≥+0.15 · 최근5분 변동률≥+1.5% (4개 이상 충족 시 확정)</span>
      </div>
      <div id="sparkList" class="list"></div>
      <div id="sparkEmpty" class="reserve" hidden>예열 코인을 탐색중…</div>
    </section>

    <!-- ULTRA -->
    <section class="card">
      <div class="title" id="ultraTitle">ULTRA 시그널 — 선택된 코인</div>
      <div class="ultra">
        <div class="box"><div class="k">현재가</div><div class="v" id="v_price">-</div></div>
        <div class="box"><div class="k">매수 (BUY1)</div><div class="v" id="v_buy1">-</div></div>
        <div class="box"><div class="k">추가매수 (BUY2)</div><div class="v" id="v_buy2">-</div></div>
        <div class="box"><div class="k">익절 1 (TP1)</div><div class="v" id="v_tp1">-</div></div>
        <div class="box"><div class="k">익절 2 (TP2)</div><div class="v" id="v_tp2">-</div></div>
        <div class="box"><div class="k">손절 (SL)</div><div class="v" id="v_sl">-</div></div>
      </div>
      <div class="pillrow" style="margin-top:10px">
        <span class="pill badge">예열강도 <b id="chip_heat">0</b></span>
        <span class="pill badge">상승확률 <b id="chip_prob">0%</b></span>
        <span class="pill badge">예상상승률 <b id="chip_gain">+0%</b></span>
        <span class="pill badge">위험도 <b id="chip_risk">-</b></span>
        <span class="pill badge">되돌림 <b id="chip_pull">-</b></span>
      </div>
      <div class="note" id="z_msg">코인을 선택하면 쩔어한마디가 표시됩니다.</div>
    </section>
  </div>

  <footer>
    사토시의지갑 v10.5 · Precision Boost · ForceIndex_AI · Bull/Bear Mode · Free Alpha Pack · 되돌림% · No-Motion DOM Patch
  </footer>
</div>

<!-- 검색 드롭다운 컨테이너 -->
<div id="suggest"></div>

<script>
/* ===== 전역 ===== */
const API_BASE = 'https://satoshi-proxy.mujukno1.workers.dev/api';
document.getElementById('apiBaseTxt').textContent = API_BASE;
const $ = s=>document.querySelector(s);
function setTxt(el, v){ if(el && el.textContent!==v) el.textContent=v; }
function clamp(n,a,b){ return Math.max(a, Math.min(b, n)); }

/* ===== 업비트 호가틱 + KRW 포맷 ===== */
function upbitTick(p){
  if (p >= 2000000) return 1000;
  if (p >= 1000000) return 500;
  if (p >= 500000)  return 100;
  if (p >= 100000)  return 50;
  if (p >= 10000)   return 10;
  if (p >= 1000)    return 1;
  if (p >= 100)     return 0.1;
  if (p >= 10)      return 0.01;
  if (p >= 1)       return 0.001;
  return 0.0001; // 초저가(시바이누 등)
}
function roundTick(price){ const t=upbitTick(price); return Math.round(price/t)*t; }
function fmtKRW(n){
  if(n==null || isNaN(n)) return '-';
  const t = upbitTick(n);
  const frac = t < 1 ? String(t).split('.')[1].length : 0;
  return roundTick(n).toLocaleString('ko-KR', {minimumFractionDigits:frac, maximumFractionDigits:frac}) + '원';
}
function pricePct(base, pct){ return roundTick(base*(1+pct)); }

/* ===== API ===== */
async function jget(path){
  try{
    const r = await fetch(API_BASE+path, {headers:{accept:'application/json'}});
    if(!r.ok) throw new Error(r.statusText);
    const d = await r.json();
    if(d && d.ok===false) throw new Error(d.error||'api');
    return d;
  }catch(e){ console.error('API ERR', path, e); return null; }
}

/* ===== 업비트 마켓 목록 & 검색 ===== */
let MARKET_LIST = []; // {market,korean_name,english_name}
async function loadMarkets(){
  if (MARKET_LIST.length) return MARKET_LIST;
  const d = await jget('/upbit/tickers');
  if (Array.isArray(d?.items)) MARKET_LIST = d.items;
  return MARKET_LIST;
}
function resolveMarket(input){
  if(!input) return null;
  const raw = input.trim();
  const s   = raw.toUpperCase();
  if (s.startsWith('KRW-')) return s;
  let hit = MARKET_LIST.find(x => (x.english_name||'').toUpperCase() === s);
  if (hit) return hit.market;
  hit = MARKET_LIST.find(x => (x.korean_name||'').includes(raw)); // 한글 부분일치
  if (hit) return hit.market;
  hit = MARKET_LIST.find(x => (x.market||'').toUpperCase().includes(s));
  return hit?.market || null;
}

/* ===== SPARK TOP10 ===== */
async function loadSpark(){
  const listEl=$('#sparkList'), emptyEl=$('#sparkEmpty');
  listEl.innerHTML='';
  const d = await jget('/spark/top?window=5m&limit=10');
  if(!Array.isArray(d?.list) || d.list.length===0){ emptyEl.hidden=false; return; }
  emptyEl.hidden=true;
  d.list.forEach(it=>{
    const row=document.createElement('div'); row.className='item'; row.dataset.m=it.market;
    const n=document.createElement('div'); n.className='name';
    n.innerHTML=`<b>${it.korean_name||it.market}</b><small style="color:var(--muted)">${it.market}</small>`;
    const r=document.createElement('div');
    r.innerHTML=`<div style="text-align:right">${fmtKRW(Number(it.price||0))}</div>
                 <div class="bar"><span style="width:${clamp(it.spark||0,0,100)}%"></span></div>
                 <div class="pillrow" style="justify-content:flex-end">
                   <span class="pill">SPARK ${it.spark||0}</span>
                   <span class="pill">RVOL ${(it.rvol??0).toFixed?.(2) ?? it.rvol}</span>
                   <span class="pill">TBR ${Math.round((it.tbr||0)*100)}%</span>
                 </div>`;
    row.appendChild(n); row.appendChild(r);
    row.addEventListener('click',()=>openUltra(it.market,it));
    listEl.appendChild(row);
  });
}

/* ===== 되돌림(%) 계산 ===== */
function computeRetracement(candles){
  if(!Array.isArray(candles)||!candles.length) return null;
  const L=candles.slice(-15);
  let H=-Infinity,Lw=Infinity,C=L[L.length-1]?.close??null;
  L.forEach(c=>{ if(c.high>H)H=c.high; if(c.low<Lw)Lw=c.low; });
  if(C==null||H===-Infinity||Lw===Infinity||H===Lw) return null;
  const R=((H-C)/(H-Lw))*100;
  const band=R<35?'얕음':R<65?'보통':'깊음';
  return {R:clamp(R,0,100), band};
}

/* ===== 멘트 생성 ===== */
function makeZMsg(s){
  const force=Number(s.forceIndex||s.force||0),
        rvol =Number(s.rvol||0),
        tbr  =Number(s.tbr||0);
  const prob=clamp(Math.round(Number(s.prob_up||s.winrate||0)),0,100);
  const gain=Number(s.expected_gain||s.exp_gain||0);
  let mode='조정';
  if((rvol>=2&&tbr>=0.65)||force>=80) mode='불장';
  else if(tbr<=0.45||force<=35||s.vwapBelow) mode='하락장';
  const heat=clamp(Math.round(Number(s.spark||s.heat||0)),0,100);
  const text= mode==='불장'
    ? `🔥 세력 분출 직전 — 예열강도 ${heat} / 상승확률 ${prob}% / 예상상승률 +${(gain||0).toFixed(1)}%`
    : mode==='하락장'
      ? `🧊 세력 이탈 감지 — 빠른 청산 필요 / 예열강도 ${heat} / 방어모드`
      : `🔵 되돌림 신호 — 분할매수 1차 확인 / 예열강도 ${heat} / 중립`;
  return {mode,msg:text,heat,prob,gain};
}

/* ===== ULTRA 시그널 ===== */
async function openUltra(market, seed){
  if(!market) return;
  const sig = await jget('/ultra/signal?market='+encodeURIComponent(market))||{};
  const s   = Object.assign({}, seed||{}, sig||{});
  const nameKor = s.korean_name||s.name_kr||s.name||market;
  setTxt($('#ultraTitle'), `ULTRA 시그널 — ${nameKor} (${market})`);

  const price=Number(s.price||s.last||s.close||0)||0;
  const buy1 = s.buy1!=null?Number(s.buy1):roundTick(price*0.997);
  const buy2 = s.buy2!=null?Number(s.buy2):roundTick(price*0.992);

  let tp1=s.tp1, tp2=s.tp2, sl=s.sl;
  if(tp1==null||tp2==null||sl==null){
    const force=Number(s.forceIndex||s.force||0), rvol=Number(s.rvol||0), tbr=Number(s.tbr||0);
    const bull=(rvol>=2&&tbr>=0.65)||force>=80, bear=(tbr<=0.45)||force<=35||s.vwapBelow;
    if(bull){ tp1=pricePct(price,0.016); tp2=pricePct(price,0.028); sl=pricePct(price,-0.008); }
    else if(bear){ tp1=pricePct(price,0.006); tp2=pricePct(price,0.010); sl=pricePct(price,-0.013); }
    else { tp1=pricePct(price,0.012); tp2=pricePct(price,0.020); sl=pricePct(price,-0.010); }
  }

  setTxt($('#v_price'),fmtKRW(price));
  setTxt($('#v_buy1'),fmtKRW(buy1));
  setTxt($('#v_buy2'),fmtKRW(buy2));
  setTxt($('#v_tp1'), fmtKRW(tp1));
  setTxt($('#v_tp2'), fmtKRW(tp2));
  setTxt($('#v_sl'),  fmtKRW(sl));

  const z=makeZMsg(s);
  setTxt($('#chip_heat'), z.heat);
  setTxt($('#chip_prob'), `${z.prob}%`);
  setTxt($('#chip_gain'), `+${(z.gain||0).toFixed(1)}%`);
  setTxt($('#chip_risk'), s.risk_level!=null?String(s.risk_level):(z.mode==='불장'?'2':z.mode==='하락장'?'4':'3'));

  let retr=null;
  if (Array.isArray(s.candles)) retr=computeRetracement(s.candles);
  if (s.retracement_percent!=null) retr={R:Number(s.retracement_percent), band:s.retr_band||''};
  setTxt($('#chip_pull'), retr? `${retr.R.toFixed(0)}% ${retr.band||''}` : '-');

  setTxt($('#z_msg'), z.msg);
}

/* ===== 검색(드롭다운 + 엔터/버튼) ===== */
const $q=$('#q'), $btn=$('#btnSearch'), $sug=$('#suggest');
function placeSuggest(){
  const r=$q.getBoundingClientRect();
  $sug.style.left=(window.scrollX+r.left)+'px';
  $sug.style.top =(window.scrollY+r.bottom+6)+'px';
  $sug.style.width=r.width+'px';
}
window.addEventListener('resize',placeSuggest);
window.addEventListener('scroll',placeSuggest);

function renderSuggest(q){
  if(!q){ $sug.style.display='none'; return; }
  const qq=q.trim().toLowerCase();
  const cand=MARKET_LIST.filter(x=>{
    const kn=(x.korean_name||'').toLowerCase();
    const en=(x.english_name||'').toLowerCase();
    const mk=(x.market||'').toLowerCase();
    return kn.includes(qq)||en.includes(qq)||mk.includes(qq);
  }).slice(0,10);
  $sug.innerHTML='';
  cand.forEach(x=>{
    const row=document.createElement('div'); row.className='row';
    row.innerHTML=`<b>${x.korean_name}</b> <span style="opacity:.7">(${x.market.replace('KRW-','')})</span>`;
    row.onclick=()=>{ $q.value=x.korean_name; $sug.style.display='none'; ensureTempSparkCard(x.market); openUltra(x.market,null); };
    $sug.appendChild(row);
  });
  placeSuggest();
  $sug.style.display=cand.length?'block':'none';
}
$q.addEventListener('input', e=>renderSuggest(e.target.value));
document.addEventListener('click', e=>{ if(e.target!==$q && !$sug.contains(e.target)) $sug.style.display='none'; });

async function doSearch(){
  const q=$q.value.trim(); if(!q) return;
  await loadMarkets();
  const market=resolveMarket(q);
  if(!market){ alert('코인을 찾을 수 없습니다. (한글/심볼/마켓코드로 검색)'); return; }
  ensureTempSparkCard(market);
  openUltra(market,null);
}
$btn.addEventListener('click', doSearch);
$q.addEventListener('keydown', e=>{ if(e.key==='Enter') doSearch(); });

function ensureTempSparkCard(market){
  const listEl=$('#sparkList');
  if (![...listEl.querySelectorAll('.item')].some(x=>x.dataset.m===market)){
    const row=document.createElement('div'); row.className='item'; row.dataset.m=market;
    const n=document.createElement('div'); n.className='name';
    const kn=(MARKET_LIST.find(x=>x.market===market)?.korean_name)||market;
    n.innerHTML=`<b>${kn}</b><small style="color:var(--muted)">${market}</small>`;
    const r=document.createElement('div');
    r.innerHTML=`<div style="text-align:right">-</div>
                 <div class="bar"><span style="width:0%"></span></div>
                 <div class="pillrow" style="justify-content:flex-end"><span class="pill">SPARK 0</span></div>`;
    row.appendChild(n); row.appendChild(r);
    row.addEventListener('click',()=>openUltra(market,null));
    listEl.prepend(row);
  }
}

/* ===== 부팅 ===== */
(async function boot(){
  jget('/ping').catch(()=>{});
  await loadMarkets();     // 이더리움 / 이더리움클래식 모두 한글/심볼 매칭
  await loadSpark();
  const first=$('#sparkList .item'); if(first) first.click();
})();
</script>
</body>
</html>
