// ====== 기본 상태 ======
const $ = (id) => document.getElementById(id);
const el = {
  ws: $("ws-status"), price: $("price"), change: $("change"), hl: $("hl"), vol: $("vol"),
  selected: $("selected-coin"), listBody: $("list-body"), tags: $("tags"), risk: $("risk"),
  buy1: $("buy1"), buy2: $("buy2"), buy3: $("buy3"), sell1: $("sell1"), sell2: $("sell2"), sell3: $("sell3"), stop1: $("stop1"), stop2: $("stop2"), stop3: $("stop3"),
};
let markets = [];          // 전체 KRW 마켓 (코드/한글/영문)
let codeMap = {};          // code -> {korean_name, english_name}
let searchIndex = [];      // 검색 인덱스
let ws = null;             // Upbit WebSocket
let currentCode = null;    // 선택된 코드 (예: KRW-BTC)
let wsAlive = false;

// ====== 업비트 틱 규칙(근사) & 포맷 ======
function upbitTick(p){
  if (p >= 2000000) return 1000;
  if (p >= 1000000) return 500;
  if (p >= 500000) return 100;
  if (p >= 100000) return 50;
  if (p >= 10000) return 10;
  if (p >= 1000) return 1;
  if (p >= 100) return 0.1;
  if (p >= 10) return 0.01;
  if (p >= 1) return 0.001;
  if (p >= 0.1) return 0.0001;
  if (p >= 0.01) return 0.00001;
  if (p >= 0.001) return 0.000001;
  return 0.00000001; // 초저가 코인까지 근사
}
function roundToTick(price){
  const t = upbitTick(price);
  return Math.round(price / t) * t;
}
function fmtKRW(n){
  // 틱 반영 + 로케일 표시
  const v = roundToTick(Number(n));
  // 소수 자리수 판단
  const t = upbitTick(v);
  let frac = 0;
  if (t < 1) {
    // 소수 자리수: t의 10의 지수만큼
    frac = Math.min(8, Math.max(0, Math.ceil(Math.abs(Math.log10(t)))));
  }
  return v.toLocaleString('ko-KR', { minimumFractionDigits: frac, maximumFractionDigits: frac });
}

// ====== 타점 계산 (현재가 기반 동적 레벨) ======
function calcLevels(price){
  const p = Number(price);
  const t = upbitTick(p);
  const buys = [p*0.995, p*0.990, p*0.985].map(x=>fmtKRW(x));
  const sells= [p*1.010, p*1.018, p*1.028].map(x=>fmtKRW(x));
  const stops= [p*0.992, p*0.985, p*0.975].map(x=>fmtKRW(x));
  return {buys, sells, stops};
}

// ====== 위험도/태그 ======
function riskFromChangeRate(rate){
  // rate: signed_change_rate (예: 0.031 = +3.1%)
  if (rate === null || rate === undefined) return {label:'-', cls:''};
  const r = rate*100;
  if (Math.abs(r) < 1) return {label:'1 (낮음)', cls:'low'};
  if (Math.abs(r) < 3) return {label:'2 (보통)', cls:'mid'};
  return {label:'3 (높음)', cls:'high'}; // 쩔다 요청에 맞춰 1~2 선호, 3은 경고
}
function tagsFromTicker(t){
  const tags = [];
  if (!t) return tags;
  const rate = t.signed_change_rate*100;
  const vol = t.acc_trade_price_24h;
  if (rate >= 3) tags.push('급등 감지');
  else if (rate >= 1) tags.push('상승');
  else if (rate <= -2) tags.push('경고');
  if (vol > 5_000_000_000) tags.push('거대 거래대금');
  if (Math.abs(rate) < 0.5) tags.push('예열 구간');
  return tags;
}

// ====== DOM 업데이트 ======
function renderTicker(t){
  if (!t) return;
  const code = t.code; // KRW-BTC
  const info = codeMap[code] || {korean_name: code.split('-')[1], english_name: ''};
  const price = t.trade_price;
  const rate = t.signed_change_rate; // 0.031 = +3.1%

  el.selected.textContent = `${code} | ${info.korean_name}${info.english_name ? ' ('+info.english_name+')':''}`;

  // 가격 + 등락률
  const priceTxt = fmtKRW(price);
  el.price.textContent = priceTxt;
  el.price.classList.remove('up','down');
  if (t.change === 'RISE') el.price.classList.add('up');
  if (t.change === 'FALL') el.price.classList.add('down');

  const pct = (rate*100).toFixed(2);
  el.change.textContent = `${pct}%`;

  // 고저/거래대금
  el.hl.textContent = `${fmtKRW(t.high_price)} / ${fmtKRW(t.low_price)}`;
  el.vol.textContent = `${Math.round(t.acc_trade_price_24h).toLocaleString('ko-KR')} KRW`;

  // 태그/위험도
  el.tags.innerHTML = '';
  tagsFromTicker(t).forEach(s=>{
    const d = document.createElement('div'); d.className = 'tag'; d.textContent = s; el.tags.appendChild(d);
  });
  const rk = riskFromChangeRate(rate);
  el.risk.className = `risk ${rk.cls}`;
  el.risk.textContent = `위험도: ${rk.label}`;

  // 타점
  const lv = calcLevels(price);
  [el.buy1, el.buy2, el.buy3].forEach((e,i)=> e.textContent = lv.buys[i]);
  [el.sell1, el.sell2, el.sell3].forEach((e,i)=> e.textContent = lv.sells[i]);
  [el.stop1, el.stop2, el.stop3].forEach((e,i)=> e.textContent = lv.stops[i]);
}

// ====== WebSocket 관리 ======
function openWS(codes){
  if (ws) try{ ws.close(); }catch(e){}
  wsAlive = false;
  ws = new WebSocket('wss://api.upbit.com/websocket/v1');
  ws.binaryType = 'arraybuffer';
  ws.onopen = () => {
    wsAlive = true; el.ws.textContent = '실시간 연결됨';
    const req = [ {ticket:'zzeol'}, {type:'ticker', codes} ];
    ws.send(JSON.stringify(req));
  };
  ws.onclose = () => { wsAlive = false; el.ws.textContent = '연결 종료 — 재시도 중...'; setTimeout(()=>selectCode(currentCode||'KRW-BTC'), 1200); };
  ws.onerror = () => { el.ws.textContent = '연결 오류'; };
  ws.onmessage = (ev) => {
    // Upbit는 바이너리(JSON 텍스트)로 옴
    const data = new TextDecoder('utf-8').decode(ev.data);
    try{
      const t = JSON.parse(data);
      if (t && t.code) renderTicker(t);
    }catch(e){ /* ignore */ }
  };
}

function selectCode(code){
  if (!code) return;
  currentCode = code;
  openWS([code]);
}

// ====== KRW 마켓 로드 & 검색 ======
async function loadMarkets(){
  const res = await fetch('https://api.upbit.com/v1/market/all?isDetails=false');
  const all = await res.json();
  markets = all.filter(x=>x.market && x.market.startsWith('KRW-'));
  codeMap = Object.fromEntries(markets.map(m=>[m.market,{korean_name:m.korean_name,english_name:m.english_name}]));
  searchIndex = markets.map(m=>({
    code:m.market,
    ko:m.korean_name.toLowerCase(),
    en:m.english_name.toLowerCase(),
    sym:m.market.replace('KRW-','').toLowerCase()
  }));
  renderList(markets);
  // 기본: KRW-BTC 선택
  selectCode('KRW-BTC');
}

function renderList(rows){
  el.listBody.innerHTML = '';
  rows.slice(0,300).forEach(m=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${m.market.replace('KRW-','')}</td><td>${m.korean_name}</td><td>${m.english_name}</td>`;
    tr.style.cursor = 'pointer';
    tr.onclick = ()=> selectCode(m.market);
    el.listBody.appendChild(tr);
  });
}

function handleSearchKeyword(q){
  const s = q.trim().toLowerCase();
  if (!s){ renderList(markets); return; }
  const filtered = searchIndex.filter(x=> x.ko.includes(s) || x.en.includes(s) || x.sym.includes(s));
  const rows = filtered.map(f=> ({
    market: f.code,
    korean_name: codeMap[f.code]?.korean_name || f.sym,
    english_name: codeMap[f.code]?.english_name || ''
  }));
  renderList(rows);
  // 심볼 완전일치 시 자동 선택
  const exact = filtered.find(x=> x.sym === s || x.ko === s || x.en === s);
  if (exact) selectCode(exact.code);
}

// ====== 초기화 ======
window.addEventListener('DOMContentLoaded', ()=>{
  loadMarkets().catch(()=>{ el.ws.textContent = '마켓 로드 실패'; });
  const input = document.getElementById('search');
  input.addEventListener('input', (e)=> handleSearchKeyword(e.target.value));
  document.getElementById('btn-clear').addEventListener('click', ()=>{ input.value=''; handleSearchKeyword(''); });
});
