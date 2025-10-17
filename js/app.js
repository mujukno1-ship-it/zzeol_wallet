/***** 공통 상태/유틸 *****/
const $ = (id) => document.getElementById(id);
const el = {
  ws: $("ws-status"), price: $("price"), change: $("change"), hl: $("hl"), vol: $("vol"),
  selected: $("selected-coin"), listBody: $("list-body"), tags: $("tags"), risk: $("risk"),
  buy1: $("buy1"), buy2: $("buy2"), buy3: $("buy3"), sell1: $("sell1"), sell2: $("sell2"), sell3: $("sell3"),
  stop1: $("stop1"), stop2: $("stop2"), stop3: $("stop3"), one: $("one-liner"),
};
let markets=[], codeMap={}, searchIndex=[], ws=null, currentCode=null, baseMarket='KRW';
let visibleCodes=[], listTickers={}, obDepth=10, USE_MOCK=false;

// 모의 데이터(네트워크 차단/실패 대비)
const mockData=[
  {market:'KRW-BTC',korean_name:'비트코인',english_name:'Bitcoin',trade_price:98700000,signed_change_rate:0.031,high_price:99500000,low_price:96000000,acc_trade_price_24h:125000000000,change:'RISE'},
  {market:'KRW-ETH',korean_name:'이더리움',english_name:'Ethereum',trade_price:3700000,signed_change_rate:0.012,high_price:3750000,low_price:3500000,acc_trade_price_24h:42000000000,change:'RISE'},
  {market:'KRW-DOGE',korean_name:'도지코인',english_name:'Dogecoin',trade_price:210,signed_change_rate:0.045,high_price:215,low_price:185,acc_trade_price_24h:18000000000,change:'RISE'},
  {market:'KRW-XRP',korean_name:'리플',english_name:'Ripple',trade_price:835,signed_change_rate:-0.008,high_price:860,low_price:820,acc_trade_price_24h:8000000000,change:'FALL'},
  {market:'KRW-CHZ',korean_name:'칠리즈',english_name:'Chiliz',trade_price:210,signed_change_rate:0.026,high_price:220,low_price:195,acc_trade_price_24h:2500000000,change:'RISE'},
];

// 문자열 정규화(검색용)
function norm(s){return (s||"").toLowerCase().normalize('NFKD').replace(/\s+/g,'').replace(/[^0-9a-z\u3131-\u318E\uAC00-\uD7AF]/g,'')}

// 업비트 호가단위 근사 + 금액 포맷
function upbitTick(p){if(p>=2_000_000)return 1000;if(p>=1_000_000)return 500;if(p>=500_000)return 100;if(p>=100_000)return 50;if(p>=10_000)return 10;if(p>=1000)return 1;if(p>=100)return .1;if(p>=10)return .01;if(p>=1)return .001;if(p>=.1)return .0001;if(p>=.01)return .00001;if(p>=.001)return .000001;return .00000001}
function roundToTick(x){const t=upbitTick(x);return Math.round(x/t)*t}
function fmtKRW(n){const v=roundToTick(Number(n));const t=upbitTick(v);let f=0;if(t<1)f=Math.min(8,Math.max(0,Math.ceil(Math.abs(Math.log10(t)))));return v.toLocaleString('ko-KR',{minimumFractionDigits:f,maximumFractionDigits:f})}

/***** 타점/한마디 *****/
let atrCache={}, ATR_PERIOD=14, ATR_TF=5, ATR_TTL=60*1000;
async function getATR(code){
  try{
    if(USE_MOCK) return Math.max(1, (mockData.find(x=>x.market===code)?.trade_price||1000)*0.01);
    const hit=atrCache[code];const now=Date.now();if(hit&&now-hit.t<ATR_TTL)return hit.v;
    const cnt=ATR_PERIOD+1;
    const url=`https://api.upbit.com/v1/candles/minutes/${ATR_TF}?market=${code}&count=${cnt}`;
    const r=await fetch(url);const arr=await r.json();if(!Array.isArray(arr)||arr.length<cnt)return null;
    let trs=[];for(let i=0;i<arr.length-1;i++){const c=arr[i],p=arr[i+1];
      const tr=Math.max(c.high_price-c.low_price,Math.abs(c.high_price-p.trade_price),Math.abs(c.low_price-p.trade_price));trs.push(tr)}
    const atr=trs.reduce((a,b)=>a+b,0)/trs.length;atrCache[code]={t:Date.now(),v:atr};return atr;
  }catch(_){return null}
}
async function updateLevelsWithATR(price,code){
  const atr=await getATR(code);const p=Number(price);if(!atr||!isFinite(p))return;
  const buys=[p-0.5*atr,p-1.0*atr,p-1.5*atr].map(fmtKRW);
  const sells=[p+0.8*atr,p+1.6*atr,p+2.4*atr].map(fmtKRW);
  const stops=[p-0.6*atr,p-1.2*atr,p-1.8*atr].map(fmtKRW);
  [el.buy1,el.buy2,el.buy3].forEach((e,i)=>e.textContent=buys[i]);
  [el.sell1,el.sell2,el.sell3].forEach((e,i)=>e.textContent=sells[i]);
  [el.stop1,el.stop2,el.stop3].forEach((e,i)=>e.textContent=stops[i]);
}
function riskFromChangeRate(rate){
  if(rate==null)return{label:'-',cls:''};const r=rate*100;
  if(Math.abs(r)<1)return{label:'1 (낮음)',cls:'low'};
  if(Math.abs(r)<3)return{label:'2 (보통)',cls:'mid'};
  return{label:'3 (높음)',cls:'high'};
}
function tagsFromTicker(t){const out=[];if(!t)return out;const r=(t.signed_change_rate||0)*100,v=t.acc_trade_price_24h||0;
  if(r>=3)out.push('급등 감지');else if(r>=1)out.push('상승');else if(r<=-2)out.push('경고');
  if(v>5_000_000_000)out.push('거대 거래대금');if(Math.abs(r)<0.5)out.push('예열 구간');return out}
function makeOneLiner(t){
  if(!t)return{text:"데이터 대기중...",cls:""};const rate=(t.signed_change_rate||0)*100,vol=t.acc_trade_price_24h||0,ch=t.change;
  let text="관망 구간. 무리한 진입 금지.",cls="";
  if(Math.abs(rate)<0.5){text="예열 구간. 분할 매집만, 급등 대기.";cls="warn";}
  if(rate>=0.5&&rate<2){text="상승 초입. 눌림 매수 구간만 노리자.";cls="good";}
  if(rate>=2&&vol>3_000_000_000){text="급등 주의! 추격 금지, 분할 익절.";cls="warn";}
  if(rate<=-2){text="하락 경고. 반등 전까지 관망 또는 짧은 스캘핑.";cls="danger";}
  if(ch==="RISE"&&rate>=3&&vol>10_000_000_000){text="모멘텀 강함. 손절 고정 + 추격 금지.";cls="warn";}
  return{text,cls};
}

/***** 렌더 *****/
function renderTicker(t){
  if(!t)return;const code=t.market||t.code;const info=codeMap[code]||{korean_name:code.split('-')[1],english_name:''};
  const price=t.trade_price, rate=t.signed_change_rate;
  el.selected.textContent=`${code} | ${info.korean_name}${info.english_name?' ('+info.english_name+')':''}`;
  el.price.textContent=fmtKRW(price);el.price.classList.remove('up','down');
  if(t.change==='RISE')el.price.classList.add('up'); if(t.change==='FALL')el.price.classList.add('down');
  el.change.textContent=`${(rate*100).toFixed(2)}%`;
  el.hl.textContent=`${fmtKRW(t.high_price)} / ${fmtKRW(t.low_price)}`;
  el.vol.textContent=`${Math.round(t.acc_trade_price_24h).toLocaleString('ko-KR')} KRW`;
  el.tags.innerHTML=''; tagsFromTicker(t).forEach(s=>{const d=document.createElement('div');d.className='tag';d.textContent=s;el.tags.appendChild(d)});
  const one=makeOneLiner(t); el.one.textContent=one.text;
  document.querySelector(".card-one")?.classList.remove("good","warn","danger");
  document.querySelector(".card-one")?.classList.add(one.cls);
  const rk=riskFromChangeRate(rate); el.risk.className=`risk ${rk.cls}`; el.risk.textContent=`위험도: ${rk.label}`;
  updateLevelsWithATR(price, code);
}
function renderOrderbook(msg){
  if(!msg||!msg.orderbook_units)return;const a=document.querySelector('#ask-table tbody'),b=document.querySelector('#bid-table tbody');if(!a||!b)return;
  const units=msg.orderbook_units.slice(0,obDepth), asks=[...units].sort((x,y)=>y.ask_price-x.ask_price), bids=[...units].sort((x,y)=>y.bid_price-x.bid_price);
  a.innerHTML=''; b.innerHTML='';
  asks.forEach(u=>{const tr=document.createElement('tr');tr.innerHTML=`<td class="price">${fmtKRW(u.ask_price)}</td><td>${u.ask_size.toLocaleString('ko-KR')}</td>`;a.appendChild(tr)});
  bids.forEach(u=>{const tr=document.createElement('tr');tr.innerHTML=`<td class="price">${fmtKRW(u.bid_price)}</td><td>${u.bid_size.toLocaleString('ko-KR')}</td>`;b.appendChild(tr)});
  if(a.firstChild)a.firstChild.classList.add('hl'); if(b.firstChild)b.firstChild.classList.add('hl');
}
function renderList(rows){
  el.listBody.innerHTML=''; visibleCodes=rows.map(r=>r.market);
  rows.forEach(m=>{
    const tr=document.createElement('tr'); tr.dataset.code=m.market;
    tr.innerHTML=`<td>${m.market.replace(baseMarket+'-','')}</td><td>${m.korean_name}</td><td>${m.english_name||''}</td>
                  <td class="td-price">-</td><td class="td-rate">-</td><td class="td-vol">-</td>`;
    tr.style.cursor='pointer'; tr.onclick=()=>selectCode(m.market); el.listBody.appendChild(tr);
  });
  refreshListPrices().catch(()=>{});
}

/***** 데이터 로드/검색 + 자동완성 *****/
async function loadMarkets(retry=0){
  try{
    if(USE_MOCK) throw new Error('force mock');
    const r=await fetch('https://api.upbit.com/v1/market/all?isDetails=false'); const all=await r.json();
    markets=all.filter(x=>x.market&&x.market.startsWith(baseMarket+'-'));
    codeMap=Object.fromEntries(markets.map(m=>[m.market,{korean_name:m.korean_name,english_name:m.english_name}]));
    searchIndex=markets.map(m=>{const sym=m.market.replace(baseMarket+'-',''),ko=m.korean_name||'',en=m.english_name||'';
      return { code:m.market, raw:{ko,en,sym}, norm:{ ko:norm(ko), en:norm(en), sym:norm(sym) } };});
    renderList(markets); selectCode(`${baseMarket}-BTC`); buildAutoList();
  }catch(e){
    if(retry<2){ setTimeout(()=>loadMarkets(retry+1),1000); }
    else{
      USE_MOCK=true;
      markets=mockData.filter(x=>x.market.startsWith(baseMarket+'-')).map(x=>({market:x.market,korean_name:x.korean_name,english_name:x.english_name}));
      codeMap=Object.fromEntries(markets.map(m=>[m.market,{korean_name:m.korean_name,english_name:m.english_name}]));
      searchIndex=markets.map(m=>{const sym=m.market.replace(baseMarket+'-',''),ko=m.korean_name||'',en=m.english_name||'';
        return { code:m.market, raw:{ko,en,sym}, norm:{ ko:norm(ko), en:norm(en), sym:norm(sym) } };});
      renderList(markets); selectCode(`${baseMarket}-BTC`); buildAutoList();
      el.ws.textContent='모의데이터 모드 (네트워크 제한?)';
    }
  }
}
function handleSearchKeyword(q){
  const s=norm(q); if(!s){ renderList(markets); hideAuto(); return; }
  const filtered=searchIndex.filter(x=>x.norm.ko.includes(s)||x.norm.en.includes(s)||x.norm.sym.includes(s));
  const rows=filtered.map(f=>({market:f.code,korean_name:f.raw.ko||f.raw.sym,english_name:f.raw.en||''}));
  renderList(rows); showAuto(s);
  const exact=filtered.find(x=>x.norm.sym===s||x.norm.ko===s||x.norm.en===s);
  if(exact) selectCode(exact.code);
}

// 자동완성
const auto=$("auto-list"); let autoItems=[], autoPos=-1;
function buildAutoList(){ autoItems = searchIndex.map(x=>({code:x.code, sym:x.raw.sym, ko:x.raw.ko, en:x.raw.en})); }
function showAuto(s){
  const q=norm(s); const items=autoItems.filter(x=> norm(x.ko).includes(q)||norm(x.en).includes(q)||norm(x.sym).includes(q)).slice(0,20);
  auto.innerHTML = items.map((it,i)=>`<li data-code="${it.code}"><b>${it.sym}</b> — ${it.ko}${it.en?` (${it.en})`:''}</li>`).join('') || '<li>결과 없음</li>';
  auto.classList.add('show'); autoPos=-1;
  Array.from(auto.children).forEach(li=>{
    li.onclick=()=>{ const c=li.dataset.code; selectCode(c); $("search").value=''; hideAuto(); renderList(markets); };
  });
}
function hideAuto(){ auto.classList.remove('show'); }
function moveAuto(dir){
  const lis=Array.from(auto.children); if(!lis.length) return;
  autoPos=(autoPos+dir+lis.length)%lis.length; lis.forEach(x=>x.classList.remove('active')); lis[autoPos].classList.add('active');
}
function pickAuto(){
  const lis=Array.from(auto.children); if(lis[autoPos]&&lis[autoPos].dataset.code){
    const c=lis[autoPos].dataset.code; selectCode(c); $("search").value=''; hideAuto(); renderList(markets);
  }
}

/***** 실시간(WebSocket) + 목록가격 *****/
function openWS(codes){
  if(USE_MOCK) return;
  if(ws)try{ws.close()}catch(_){}
  ws=new WebSocket('wss://api.upbit.com/websocket/v1'); ws.binaryType='arraybuffer';
  ws.onopen=()=>{ el.ws.textContent='실시간 연결됨';
    ws.send(JSON.stringify([{ticket:'zzeol'},{type:'ticker',codes},{type:'orderbook',codes}])); };
  ws.onclose=()=>{ el.ws.textContent='연결 종료 — 재시도 중...'; setTimeout(()=>selectCode(currentCode||`${baseMarket}-BTC`),1200); };
  ws.onerror =()=>{ el.ws.textContent='연결 오류'; };
  ws.onmessage=(ev)=>{ const data=new TextDecoder('utf-8').decode(ev.data);
    try{ const t=JSON.parse(data);
      if(t&&t.code&&t.trade_price!==undefined) renderTicker({...t, market:t.code});
      else if(t&&t.code&&t.orderbook_units)    renderOrderbook(t);
    }catch(_){ }
  };
}
function selectCode(code){
  if(!code) return; currentCode=code; openWS([code]);
  if(USE_MOCK){ const t=mockData.find(x=>x.market===code)||mockData[0]; renderTicker(t);
    renderOrderbook({orderbook_units:[{ask_price:t.trade_price*1.01,ask_size:10,bid_price:t.trade_price*0.99,bid_size:12}]}); }
}
async function fetchTickersBatch(codes){
  const out={}; if(USE_MOCK){ mockData.forEach(t=>out[t.market]=t); return out; }
  for(let i=0;i<codes.length;i+=30){
    const part=codes.slice(i,i+30); const url=`https://api.upbit.com/v1/ticker?markets=${part.join(',')}`;
    try{ const r=await fetch(url); const js=await r.json(); js.forEach(t=>out[t.market]=t); }catch(_){}
  } return out;
}
async function refreshListPrices(){
  if(!visibleCodes.length) return;
  const tmap=await fetchTickersBatch(visibleCodes); listTickers=tmap;
  const sorted=[...visibleCodes].sort((a,b)=>((tmap[b]?.acc_trade_price_24h||0)-(tmap[a]?.acc_trade_price_24h||0)));
  const frag=document.createDocumentFragment();
  sorted.forEach(code=>{
    const tr=el.listBody.querySelector(`tr[data-code="${code}"]`); if(!tr) return;
    const t=tmap[code] || mockData.find(x=>x.market===code);
    if(t){ tr.querySelector('.td-price').textContent=fmtKRW(t.trade_price);
      tr.querySelector('.td-rate').textContent=((t.signed_change_rate||0)*100).toFixed(2)+'%';
      tr.querySelector('.td-vol').textContent=Math.round(t.acc_trade_price_24h||0).toLocaleString('ko-KR')+' KRW';}
    frag.appendChild(tr);
  });
  el.listBody.innerHTML=''; el.listBody.appendChild(frag);
}

/***** 급등 TOP10 *****/
async function refreshTopGainers(){
  const tbody=$("gainers-body"); if(!tbody) return;
  tbody.innerHTML=`<tr><td colspan="6">불러오는 중...</td></tr>`;
  if(!markets.length) await loadMarkets().catch(()=>{});
  const codes=markets.map(m=>m.market), tmap=await fetchTickersBatch(codes);
  const arr=Object.values(tmap).map(t=>({code:t.market, rate:(t.signed_change_rate||0)*100, price:t.trade_price, vol:t.acc_trade_price_24h||0}));
  arr.sort((a,b)=> b.rate!==a.rate ? b.rate-a.rate : (b.vol||0)-(a.vol||0));
  const top=arr.slice(0,10);
  tbody.innerHTML = top.length ? '' : '<tr><td colspan="6">데이터 없음</td></tr>';
  top.forEach((it,idx)=>{
    const info=codeMap[it.code]||{korean_name:it.code.split('-')[1],english_name:''};
    const tr=document.createElement('tr'); const rateTxt=`${it.rate.toFixed(2)}%`;
    tr.innerHTML=`<td>${idx+1}</td><td>${it.code.replace(baseMarket+'-','')}</td><td>${info.korean_name}</td>
                  <td>${fmtKRW(it.price)}</td><td class="${it.rate>=0?'up':'down'}">${rateTxt}</td>
                  <td>${Math.round(it.vol).toLocaleString('ko-KR')} KRW</td>`;
    tr.style.cursor='pointer'; tr.onclick=()=>selectCode(it.code); tbody.appendChild(tr);
  });
}

/***** 초기화 *****/
window.addEventListener('DOMContentLoaded', ()=>{
  const input=$("search");
  input.addEventListener('input', e=>handleSearchKeyword(e.target.value));
  input.addEventListener('keydown', e=>{
    if(e.key==='ArrowDown'){ moveAuto(1); e.preventDefault(); }
    else if(e.key==='ArrowUp'){ moveAuto(-1); e.preventDefault(); }
    else if(e.key==='Enter'){ if(auto.classList.contains('show')){ pickAuto(); e.preventDefault(); } else { const first=el.listBody.querySelector('tr'); if(first) first.click(); } }
    else if(e.key==='Escape'){ hideAuto(); }
  });
  document.addEventListener('click', (ev)=>{ if(!ev.target.closest('.search-wrap')) hideAuto(); });

  $("btn-clear").addEventListener('click', ()=>{ input.value=''; handleSearchKeyword(''); });

  const sel=$("base-market"); sel.value=baseMarket;
  sel.addEventListener('change', async ()=>{
    baseMarket = sel.value; markets=[]; await loadMarkets().catch(()=>{}); refreshTopGainers();
  });

  loadMarkets().then(()=>refreshTopGainers());
  setInterval(()=>{ refreshListPrices().catch(()=>{}); }, 5000);
  setInterval(()=>{ refreshTopGainers().catch(()=>{}); }, 20000);
});
