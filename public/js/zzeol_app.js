// ===== 유틸 & 상태 =====
const $ = (id) => document.getElementById(id);
const el = {
  ws: $("ws-status"), price: $("price"), change: $("change"), hl: $("hl"), vol: $("vol"),
  selected: $("selected-coin"), listBody: $("list-body"), tags: $("tags"), risk: $("risk"),
  buy1: $("buy1"), buy2: $("buy2"), buy3: $("buy3"), sell1: $("sell1"), sell2: $("sell2"), sell3: $("sell3"),
  stop1: $("stop1"), stop2: $("stop2"), stop3: $("stop3"),
};

let markets = [];          // 현재 마켓의 종목 목록
let codeMap = {};          // code -> {korean_name, english_name}
let searchIndex = [];      // 검색 인덱스
let ws = null;             // WebSocket (ticker+orderbook)
let currentCode = null;    // 선택 코드
let baseMarket = 'KRW';    // KRW/USDT/BTC
let visibleCodes = [];     // 현재 목록에 표시 중인 코드
let obDepth = 10;          // 호가 레벨
let listTickers = {};      // 목록용 최신 티커 데이터

// 문자열 정규화: 소문자 + 공백제거 + 한글/영문/숫자만
function norm(str){
  return (str || "")
    .toLowerCase()
    .normalize('NFKD')
    .replace(/\s+/g, '')
    .replace(/[^0-9a-z\u3131-\u318E\uAC00-\uD7AF]/g, '');
}

// 업비트 틱 규칙(근사) & 포맷
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
  if (p >= 0.1)     return 0.0001;
  if (p >= 0.01)    return 0.00001;
  if (p >= 0.001)   return 0.000001;
  return 0.00000001;
}
function roundToTick(price){
  const t = upbitTick(price);
  return Math.round(price / t) * t;
}
function fmtKRW(n){
  const v = roundToTick(Number(n));
  const t = upbitTick(v);
  let frac = 0;
  if (t < 1) frac = Math.min(8, Math.max(0, Math.ceil(Math.abs(Math.log10(t)))));
  return v.toLocaleString('ko-KR', { minimumFractionDigits: frac, maximumFractionDigits: frac });
}

// 타점/위험/태그
function calcLevels(price){
  const p = Number(price);
  return {
    buys: [p*0.995, p*0.990, p*0.985].map(fmtKRW),
    sells:[p*1.010, p*1.018, p*1.028].map(fmtKRW),
    stops:[p*0.992, p*0.985, p*0.975].map(fmtKRW),
  };
}
function riskFromChangeRate(rate){
  if (rate == null) return {label:'-', cls:''};
  const r = rate*100;
  if (Math.abs(r) < 1) return {label:'1 (낮음)', cls:'low'};
  if (Math.abs(r) < 3) return {label:'2 (보통)', cls:'mid'};
  return {label:'3 (높음)', cls:'high'};
}
function tagsFromTicker(t){
  const out = [];
  if (!t) return out;
  const rate = t.signed_change_rate*100;
  const vol = t.acc_trade_price_24h;
  if (rate >= 3) out.push('급등 감지');
  else if (rate >= 1) out.push('상승');
  else if (rate <= -2) out.push('경고');
  if (vol > 5_000_000_000) out.push('거대 거래대금');
  if (Math.abs(rate) < 0.5) out.push('예열 구간');
  return out;
}

// 상단 카드 렌더
function renderTicker(t){
  if (!t) return;
  const code = t.code;
  const info = codeMap[code] || {korean_name: code.split('-')[1], english_name: ''};
  const price = t.trade_price;
  const rate = t.signed_change_rate;

  el.selected.textContent = `${code} | ${info.korean_name}${info.english_name ? ' ('+info.english_name+')':''}`;
  el.price.textContent = fmtKRW(price);
  el.price.classList.remove('up','down');
  if (t.change === 'RISE') el.price.classList.add('up');
  if (t.change === 'FALL') el.price.classList.add('down');

  el.change.textContent = `${(rate*100).toFixed(2)}%`;
  el.hl.textContent     = `${fmtKRW(t.high_price)} / ${fmtKRW(t.low_price)}`;
  el.vol.textContent    = `${Math.round(t.acc_trade_price_24h).toLocaleString('ko-KR')} KRW`;

  el.tags.innerHTML = '';
  tagsFromTicker(t).forEach(s=>{
    const d = document.createElement('div'); d.className = 'tag'; d.textContent = s; el.tags.appendChild(d);
  });

  const rk = riskFromChangeRate(rate);
  el.risk.className = `risk ${rk.cls}`;
  el.risk.textContent = `위험도: ${rk.label}`;

  const lv = calcLevels(price);
  [el.buy1, el.buy2, el.buy3].forEach((e,i)=> e.textContent = lv.buys[i]);
  [el.sell1, el.sell2, el.sell3].forEach((e,i)=> e.textContent = lv.sells[i]);
  [el.stop1, el.stop2, el.stop3].forEach((e,i)=> e.textContent = lv.stops[i]);
}

// 호가창 렌더
function renderOrderbook(msg){
  if(!msg || !msg.orderbook_units) return;
  const asksTbody = document.querySelector('#ask-table tbody');
  const bidsTbody = document.querySelector('#bid-table tbody');
  if(!asksTbody || !bidsTbody) return;

  const units = msg.orderbook_units.slice(0, obDepth);
  const asks = [...units].sort((a,b)=> b.ask_price - a.ask_price);
  const bids = [...units].sort((a,b)=> b.bid_price - a.bid_price);

  asksTbody.innerHTML = '';
  bidsTbody.innerHTML = '';

  asks.forEach(u=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `<td class="price">${fmtKRW(u.ask_price)}</td><td>${u.ask_size.toLocaleString('ko-KR')}</td>`;
    asksTbody.appendChild(tr);
  });
  bids.forEach(u=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `<td class="price">${fmtKRW(u.bid_price)}</td><td>${u.bid_size.toLocaleString('ko-KR')}</td>`;
    bidsTbody.appendChild(tr);
  });

  if(asksTbody.firstChild) asksTbody.firstChild.classList.add('hl');
  if(bidsTbody.firstChild) bidsTbody.firstChild.classList.add('hl');
}

// 목록 렌더 + 가격 채우기
function renderList(rows){
  el.listBody.innerHTML = '';
  visibleCodes = rows.map(r => r.market);

  rows.forEach(m=>{
    const tr = document.createElement('tr');
    tr.setAttribute('data-code', m.market);
    tr.innerHTML = `
      <td>${m.market.replace(baseMarket+'-','')}</td>
      <td>${m.korean_name}</td>
      <td>${m.english_name}</td>
      <td class="td-price">-</td>
      <td class="td-rate">-</td>
      <td class="td-vol">-</td>
    `;
    tr.style.cursor = 'pointer';
    tr.onclick = ()=> selectCode(m.market);
    el.listBody.appendChild(tr);
  });

  refreshListPrices().catch(()=>{});
}

// 다건 티커 조회(REST) + 정렬
async function fetchTickers(codes){
  const out = {};
  for (let i=0; i<codes.length; i+=30){
    const part = codes.slice(i, i+30);
    const url = `https://api.upbit.com/v1/ticker?markets=${part.join(',')}`;
    const res = await fetch(url);
    const js  = await res.json();
    js.forEach(t => { out[t.market] = t; });
  }
  return out;
}
async function refreshListPrices(){
  if (!visibleCodes.length) return;
  const tmap = await fetchTickers(visibleCodes);
  listTickers = tmap;

  const sorted = [...visibleCodes].sort((a,b)=>{
    const va = (tmap[a]?.acc_trade_price_24h ?? 0);
    const vb = (tmap[b]?.acc_trade_price_24h ?? 0);
    return vb - va;
  });

  const frag = document.createDocumentFragment();
  sorted.forEach(code=>{
    const tr = el.listBody.querySelector(`tr[data-code="${code}"]`);
    if (!tr) return;
    const t = tmap[code];
    if (t){
      tr.querySelector('.td-price').textContent = fmtKRW(t.trade_price);
      tr.querySelector('.td-rate').textContent  = (t.signed_change_rate*100).toFixed(2) + '%';
      tr.querySelector('.td-vol').textContent   = Math.round(t.acc_trade_price_24h).toLocaleString('ko-KR') + ' KRW';
    }
    frag.appendChild(tr);
  });
  el.listBody.innerHTML = '';
  el.listBody.appendChild(frag);
}

// WS 관리 (ticker + orderbook 동시)
function openWS(codes){
  if (ws) try{ ws.close(); }catch(e){}
  ws = new WebSocket('wss://api.upbit.com/websocket/v1');
  ws.binaryType = 'arraybuffer';
  ws.onopen = () => {
    el.ws.textContent = '실시간 연결됨';
    ws.send(JSON.stringify([
      { ticket: 'zzeol' },
      { type: 'ticker', codes },
      { type: 'orderbook', codes }
    ]));
  };
  ws.onclose = () => { el.ws.textContent = '연결 종료 — 재시도 중...'; setTimeout(()=>selectCode(currentCode||`${baseMarket}-BTC`), 1000); };
  ws.onerror  = () => { el.ws.textContent = '연결 오류'; };
  ws.onmessage = (ev) => {
    const data = new TextDecoder('utf-8').decode(ev.data);
    try{
      const t = JSON.parse(data);
      if (t && t.code && t.trade_price !== undefined) renderTicker(t);
      else if (t && t.code && t.orderbook_units)     renderOrderbook(t);
    }catch(e){}
  };
}
function selectCode(code){
  if (!code) return;
  currentCode = code;
  openWS([code]);
}

// 마켓 로드 & 검색
async function loadMarkets(){
  const res = await fetch('https://api.upbit.com/v1/market/all?isDetails=false');
  const all = await res.json();
  markets = all.filter(x=>x.market && x.market.startsWith(baseMarket + '-'));
  codeMap = Object.fromEntries(markets.map(m=>[m.market,{korean_name:m.korean_name,english_name:m.english_name}]));
  searchIndex = markets.map(m => {
    const sym = m.market.replace(baseMarket+'-','');
    const ko  = m.korean_name || '';
    const en  = m.english_name || '';
    return { code:m.market, raw:{ko,en,sym}, norm:{ ko:norm(ko), en:norm(en), sym:norm(sym) } };
  });
  renderList(markets);
  selectCode(`${baseMarket}-BTC`);
}
function handleSearchKeyword(q){
  const s = norm(q);
  if (!s){ renderList(markets); return; }
  const filtered = searchIndex.filter(x =>
    x.norm.ko.includes(s) || x.norm.en.includes(s) || x.norm.sym.includes(s)
  );
  const rows = filtered.map(f => ({
    market: f.code,
    korean_name: f.raw.ko || f.raw.sym,
    english_name: f.raw.en || ''
  }));
  renderList(rows);
  const exact = filtered.find(x => x.norm.sym === s || x.norm.ko === s || x.norm.en === s);
  if (exact) selectCode(exact.code);
}

// 초기화
window.addEventListener('DOMContentLoaded', ()=>{
  // 마켓 로드
  loadMarkets().catch(()=>{ el.ws.textContent = '마켓 로드 실패'; });

  // 검색
  const input = document.getElementById('search');
  input.addEventListener('input', (e)=> handleSearchKeyword(e.target.value));
  input.addEventListener('keydown', (e)=>{ if (e.key === 'Enter'){ const first = el.listBody.querySelector('tr'); if (first) first.click(); }});
  document.getElementById('btn-clear').addEventListener('click', ()=>{ input.value=''; handleSearchKeyword(''); });

  // 마켓 셀렉트
  const sel = document.getElementById('base-market');
  if (sel){
    sel.value = baseMarket;
    sel.addEventListener('change', async ()=>{
      baseMarket = sel.value;
      try{
        const res = await fetch('https://api.upbit.com/v1/market/all?isDetails=false');
        const all = await res.json();
        markets = all.filter(x=>x.market && x.market.startsWith(baseMarket + '-'));
        codeMap = Object.fromEntries(markets.map(m=>[m.market,{korean_name:m.korean_name,english_name:m.english_name}]));
        searchIndex = markets.map(m=>{
          const sym = m.market.replace(baseMarket+'-','');
          const ko  = m.korean_name || '';
          const en  = m.english_name || '';
          return { code:m.market, raw:{ko,en,sym}, norm:{ ko:norm(ko), en:norm(en), sym:norm(sym) } };
        });
        renderList(markets);
        selectCode(`${baseMarket}-BTC`);
      }catch(e){
        el.ws.textContent = '마켓 로드 실패';
      }
    });
  }

  // 목록 가격 주기 갱신
  setInterval(()=>{ refreshListPrices().catch(()=>{}); }, 5000);
});
