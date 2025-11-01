// main.js (module)
const API_BASE = '/api'; // Worker가 프록시하도록 호출
document.getElementById('apiBaseTxt').textContent = API_BASE;

const REFRESH_SPARK_MS = 15000;
const REFRESH_ULTRA_MS = 5000;
const USE_CANDLES = true;
const CANDLE_LIMIT = 240;

/* ===== 유틸 ===== */
const $ = s => document.querySelector(s);
const setTxt = (el, v) => { if (el && String(el.textContent) !== String(v)) el.textContent = String(v); };
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const debounce = (fn, ms = 200) => { let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); }; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;

/* ===== 업비트 호가틱 + KRW 포맷 ===== */
function upbitTick(p) {
  if (p >= 2000000) return 1000;
  if (p >= 1000000) return 500;
  if (p >= 500000) return 100;
  if (p >= 100000) return 50;
  if (p >= 10000) return 10;
  if (p >= 1000) return 1;
  if (p >= 100) return 0.1;
  if (p >= 10) return 0.01;
  if (p >= 1) return 0.001;
  return 0.0001;
}
function roundTick(price) { const t = upbitTick(price); return Math.round(Number(price) / t) * t; }
function fmtKRW(n) {
  if (n == null || isNaN(n)) return '-';
  const v = roundTick(Number(n));
  const t = upbitTick(v);
  const frac = t < 1 ? String(t).split('.')[1].length : 0;
  return v.toLocaleString('ko-KR', { minimumFractionDigits: frac, maximumFractionDigits: frac }) + '원';
}
function pricePct(base, pct) { return roundTick(Number(base) * (1 + Number(pct))); }

/* ===== API 헬퍼 (Worker 프록시) ===== */
async function jget(path, { retries = 2, timeout = 9000 } = {}) {
  let lastErr = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const ctl = new AbortController();
    const to = setTimeout(() => ctl.abort(), timeout);
    try {
      const t0 = performance.now();
      const r = await fetch(API_BASE + path, { headers: { accept: 'application/json' }, signal: ctl.signal });
      clearTimeout(to);
      if (!r.ok) throw new Error(r.status + ' ' + r.statusText);
      const d = await r.json();
      if (path === '/ping') setTxt($('#latency'), Math.round(performance.now() - t0) + 'ms');
      if (d && d.ok === false) throw new Error(d.error || 'api');
      return d;
    } catch (e) {
      clearTimeout(to);
      lastErr = e;
      await sleep(200 + attempt * 250);
    }
  }
  console.error('API ERR', path, lastErr);
  return null;
}

/* ===== API 헬스 체크 ===== */
async function ping() {
  const badge = $('#apiHealth');
  const warn = $('#apiWarn');
  const ok = await jget('/ping', { retries: 1 });
  if (ok?.pong) { badge.classList.add('ok'); badge.classList.remove('fail'); warn.style.display = 'none'; }
  else { badge.classList.add('fail'); badge.classList.remove('ok'); warn.style.display = 'block'; }
}

/* ===== 마켓 목록 & 검색 ===== */
let MARKET_LIST = [];
async function loadMarkets() {
  if (MARKET_LIST.length) return MARKET_LIST;
  const d = await jget('/upbit/tickers', { retries: 2 });
  if (Array.isArray(d?.items)) MARKET_LIST = d.items;
  return MARKET_LIST;
}
function resolveMarket(input) {
  if (!input) return null;
  const raw = input.trim();
  const s = raw.toUpperCase();
  if (s.startsWith('KRW-')) return s;
  let hit = MARKET_LIST.find(x => (x.english_name || '').toUpperCase() === s);
  if (hit) return hit.market;
  hit = MARKET_LIST.find(x => (x.korean_name || '').includes(raw));
  if (hit) return hit.market;
  hit = MARKET_LIST.find(x => (x.market || '').toUpperCase().includes(s));
  return hit?.market || null;
}

/* ===== SPARK TOP10 ===== */
let sparkTimer = null;
async function renderSpark() {
  const listEl = $('#sparkList'), emptyEl = $('#sparkEmpty');
  const d = await jget('/spark/top?limit=10', { retries: 1 });
  listEl.innerHTML = '';
  if (!Array.isArray(d?.list) || d.list.length === 0) { emptyEl.hidden = false; return; }
  emptyEl.hidden = true;

  d.list.forEach(it => {
    const row = document.createElement('div'); row.className = 'item'; row.dataset.m = it.market;
    const n = document.createElement('div'); n.className = 'name';
    n.innerHTML = `<b>${it.korean_name || it.market}</b><small style="color:var(--muted)">${it.market}</small>`;
    const r = document.createElement('div');
    r.innerHTML = `<div style="text-align:right">${fmtKRW(Number(it.price || 0))}</div>
                 <div class="bar"><span style="width:${clamp(it.spark || 0, 0, 100)}%"></span></div>
                 <div class="pillrow" style="justify-content:flex-end">
                   <span class="pill">SPARK ${it.spark || 0}</span>
                   <span class="pill">RVOL ${(it.rvol ?? 0).toFixed?.(2) ?? it.rvol}</span>
                   <span class="pill">TBR ${Math.round((it.tbr || 0) * 100)}%</span>
                 </div>`;
    row.appendChild(n); row.appendChild(r);
    row.addEventListener('click', () => openUltra(it.market, it));
    listEl.appendChild(row);
  });
}
function startSparkAuto() { if (sparkTimer) clearInterval(sparkTimer); sparkTimer = setInterval(renderSpark, REFRESH_SPARK_MS); }

/* ===== Candles/ATR/RVOL 계산 ===== */
async function loadCandles(market) { if (!USE_CANDLES) return null; const d = await jget(`/candles?market=${encodeURIComponent(market)}&tf=1m&limit=${CANDLE_LIMIT}`, { retries: 1 }); return Array.isArray(d?.items || d) ? (d.items || d) : null; }
function calcATR(candles, n = 14) {
  if (!Array.isArray(candles) || candles.length < n + 1) return { atr: 0, atrPct: 0, hh: null, ll: null, lastClose: candles?.[0]?.close || 0 };
  let TR = 0;
  for (let i = 1; i <= n; i++) {
    const c = candles[candles.length - 1 - i], p = candles[candles.length - 2 - i] || c;
    const tr = Math.max(c.high - c.low, Math.abs(c.high - p.close), Math.abs(c.low - p.close));
    TR += tr;
  }
  const atr = TR / n;
  const recent = candles.slice(-Math.max(n * 2, 30));
  let hh = -Infinity, ll = Infinity;
  for (const c of recent) { if (c.high > hh) hh = c.high; if (c.low < ll) ll = c.low; }
  const lastClose = candles[candles.length - 1]?.close ?? (hh + ll) / 2;
  const atrPct = lastClose ? (atr / lastClose) : 0;
  return { atr, atrPct, hh, ll, lastClose };
}
function calcRVOL(candles, look = 20) {
  const L = (candles || []).slice(-look);
  if (L.length < 5) return 0;
  const vols = L.map(c => Number(c.volume) || 0);
  const vLast = vols[vols.length - 1]; const vMean = vols.slice(0, -1).reduce((a, b) => a + b, 0) / (vols.length - 1 || 1);
  return vMean ? vLast / vMean : 0;
}

/* ===== 쩔어한마디 / MTF / Precision ===== */
/* ... main functions copied from prior inline script ... */
function makeZMsg(s) {
  const force = Number(s.force || s.forceIndex || 0), rvol = Number(s.rvol || 0), tbr = Number(s.tbr || 0);
  const heat = clamp(Math.round(Number(s.spark || s.heat || 0)), 0, 100);
  const prob = clamp(Math.round(Number(s.prob_up ?? (heat / 1.6))), 0, 100);
  const gain = Number(s.expected_gain ?? (heat >= 90 ? 20 : heat >= 80 ? 10 : heat >= 70 ? 5 : 2));
  let mode = '조정';
  if ((rvol >= 2 && tbr >= 0.65) || force >= 80) mode = '불장';
  else if (tbr <= 0.45 || force <= 35 || s.vwapBelow) mode = '하락장';
  const text = mode === '불장' ? `🔥 세력 분출 직전 — 예열강도 ${heat} / 상승확률 ${prob}% / 예상상승률 +${(+gain).toFixed(1)}%`
    : mode === '하락장' ? `🧊 세력 이탈 감지 — 빠른 청산 필요 / 예열강도 ${heat} / 방어모드`
      : `🔵 되돌림 신호 — 분할매수 1차 확인 / 예열강도 ${heat} / 중립`;
  return { mode, msg: text, heat, prob, gain };
}
function calcMTFAdjust(seed) {
  const s = seed || {};
  const price = Number(s.price || 0) || 0;
  const heat = clamp(Number(s.spark || 0), 0, 100);
  const rvol = Number(s.rvol || 0);
  const tbr = Number(s.tbr || 0);
  const retrP = Number(s.retracement_percent || 0);
  const volRank = clamp(rvol / 3, 0, 1);
  const w = { m1: 0.18 * volRank, m5: 0.16 * volRank, m30: 0.12 * volRank + 0.04, h1: 0.12 * (0.6 + volRank * 0.4),
    h4: 0.12 * (0.5 + (1 - volRank) * 0.5), h6: 0.08 * (0.5 + (1 - volRank) * 0.5), d1: 0.10 * (0.4 + (1 - volRank) * 0.6),
    w1: 0.07 * (0.3 + (1 - volRank) * 0.7), m1x: 0.05 * (0.3 + (1 - volRank) * 0.7) };
  const sigShort = ((heat - 50) / 50) * 0.5 + (tbr - 0.5) * 0.6 - (retrP > 65 ? 0.2 : 0) + (retrP < 35 ? 0.15 : 0);
  const sigMid = ((heat - 50) / 50) * 0.4 + (tbr - 0.5) * 0.4;
  const sigLong = ((heat - 50) / 50) * 0.3 + (tbr - 0.5) * 0.3;
  const S = { m1: clamp(sigShort, -1, 1), m5: clamp(sigShort * 0.9, -1, 1), m30: clamp((sigShort * 0.6 + sigMid * 0.4), -1, 1),
    h1: clamp(sigMid, -1, 1), h4: clamp((sigMid * 0.7 + sigLong * 0.3), -1, 1), h6: clamp((sigMid * 0.6 + sigLong * 0.4), -1, 1),
    d1: clamp(sigLong, -1, 1), w1: clamp(sigLong * 0.8, -1, 1), m1x: clamp(sigLong * 0.7, -1, 1) };
  const sumW = Object.values(w).reduce((a, b) => a + b, 0) || 1;
  let mtfScore = 0; for (const k of Object.keys(S)) { mtfScore += (S[k] * 100) * (w[k] / sumW); }
  mtfScore = clamp(Math.round(mtfScore), -100, 100);
  const mode = mtfScore >= 35 ? '불장' : mtfScore <= -35 ? '하락장' : '조정';
  let adj = Math.min(0.003, Math.max(0.0015, Math.abs(mtfScore) / 4000));
  if (mode !== '조정') adj = Math.min(0.003, adj * 1.2);
  return { mtfScore, mode, adj, price };
}
function calcPrecision(seed, mtf, atrPct) {
  const s = seed || {};
  const force = Number(s.forceIndex || s.force || 0);
  const rvol = Number(s.rvol || 0);
  const tbr = Number(s.tbr || 0);
  const obi = Number(s.obi || s.order_imbalance || 0);
  const heat = clamp(Number(s.spark || 0), 0, 100);
  const mtfNorm = (clamp(mtf.mtfScore, -100, 100) + 100) / 200;
  const forceN = clamp(force / 100, 0, 1);
  const tbrN = clamp((tbr - 0.4) / 0.4, 0, 1);
  const rvolN = clamp((rvol - 0.8) / 2.0, 0, 1);
  const obiN = clamp((obi + 0.2) / 0.4, 0, 1);
  const atrOK = clamp(1 - Math.abs((atrPct ?? 0) - 0.012) / 0.02, 0, 1);
  let score = (forceN * 0.28) + (tbrN * 0.22) + (rvolN * 0.18) + (mtfNorm * 0.18) + (obiN * 0.08) + (atrOK * 0.06);
  score += clamp((heat - 60) / 100, 0, 0.08);
  let prec = clamp(Math.round((0.82 + score * 0.16) * 1000) / 10, 85, 99.9);
  return prec;
}

/* ===== Precision History (로컬 저장) ===== */
const PREC_KEY = 'satoshi_prec_history';
function pushPrecisionHistory(v) {
  try {
    const arr = JSON.parse(localStorage.getItem(PREC_KEY) || '[]');
    arr.push(Math.round(v * 10) / 10);
    while (arr.length > 120) arr.shift();
    localStorage.setItem(PREC_KEY, JSON.stringify(arr));
    return arr;
  } catch { return [v]; }
}
function readPrecisionHistory() { try { return JSON.parse(localStorage.getItem(PREC_KEY) || '[]'); } catch { return []; } }
function drawSparkline(values) {
  const svg = $('#precSpark'), line = $('#precLine');
  if (!svg || !line) return;
  const w = 300, h = 80, pad = 6;
  const n = values.length || 1;
  const min = Math.min(...values, 80), max = Math.max(...values, 100);
  const xs = i => pad + (w - 2 * pad) * (n <= 1 ? 0.5 : i / (n - 1));
  const ys = v => h - pad - (h - 2 * pad) * ((v - min) / Math.max(1, (max - min) || 1));
  const pts = values.map((v, i) => `${xs(i)},${ys(v)}`).join(' ');
  line.setAttribute('points', pts);
  setTxt($('#precCount'), n);
  setTxt($('#precAvg'), (Math.round(avg(values) * 10) / 10 || '-') + '%');
}

/* ===== 게이지 도우미 ===== */
function setGauge(circleEl, textEl, pct) {
  const C = 2 * Math.PI * 50;
  const d = C * (1 - clamp(pct, 0, 100) / 100);
  circleEl.setAttribute('stroke-dashoffset', d.toFixed(1));
  setTxt(textEl, `${pct.toFixed(1)}%`);
}

/* ===== 상태 ===== */
let currentMarket = null, ultraTimer = null;

/* ===== ULTRA (주요 로직) ===== */
async function openUltra(market, seed) {
  if (!market) return;
  currentMarket = market;

  const [sig, candles] = await Promise.all([
    jget('/ultra/signal?market=' + encodeURIComponent(market)) || {},
    loadCandles(market)
  ]);
  const s = Object.assign({}, seed || {}, sig || {});
  const nameKor = s.korean_name || (MARKET_LIST.find(x => x.market === market)?.korean_name) || s.name_kr || s.name || market;
  setTxt($('#ultraTitle'), `ULTRA 시그널 — ${nameKor} (${market})`);

  const price = roundTick(Number(s.price || s.last || s.close || (candles?.[candles.length - 1]?.close || 0)) || 0);
  const buy1 = s.buy1 != null ? roundTick(Number(s.buy1)) : roundTick(price * 0.997);
  const buy2 = s.buy2 != null ? roundTick(Number(s.buy2)) : roundTick(price * 0.992);

  let atr = 0, atrPct = 0, hh = null, ll = null, lastClose = price;
  if (Array.isArray(candles)) {
    const a = calcATR(candles, 14); atr = a.atr; atrPct = a.atrPct; hh = a.hh; ll = a.ll; lastClose = a.lastClose || price;
  }
  if (s.recent_high) hh = s.recent_high;
  if (s.recent_low) ll = s.recent_low;

  const rvol = Number(s.rvol ?? (Array.isArray(candles) ? calcRVOL(candles, 20) : 0));
  const tbr = Number(s.tbr ?? 0.5);
  const bull = (rvol >= 2 && tbr >= 0.65) || rvol >= 3;
  const bear = tbr <= 0.45 || rvol <= 0.8;
  const k = clamp(atrPct || 0, 0.004, 0.04);

  // 기본 TP/SL
  let tp1 = s.tp1, tp2 = s.tp2, sl = s.sl;
  if (tp1 == null || tp2 == null || sl == null) {
    if (bull) {
      tp1 = roundTick(price + Math.max(price * 0.012, price * k * 1.6));
      tp2 = roundTick(price + Math.max(price * 0.020, price * k * 2.6));
      sl = roundTick(price - Math.max(price * 0.008, price * k * 0.9));
    } else if (bear) {
      tp1 = roundTick(price + Math.max(price * 0.006, price * k * 0.7));
      tp2 = roundTick(price + Math.max(price * 0.010, price * k * 1.1));
      sl = roundTick(price - Math.max(price * 0.013, price * k * 1.4));
    } else {
      tp1 = roundTick(price + Math.max(price * 0.010, price * k * 1.2));
      tp2 = roundTick(price + Math.max(price * 0.018, price * k * 2.0));
      sl = roundTick(price - Math.max(price * 0.010, price * k * 1.0));
    }
  }

  // MTF 보정
  const mtf = calcMTFAdjust(s);
  const sign = (mtf.mode === '불장') ? +1 : (mtf.mode === '하락장') ? -1 : 0;
  const tpAdjPct = sign * mtf.adj;
  const slAdjPct = -sign * (mtf.adj * 0.8);
  let tp1_adj = pricePct(tp1, tpAdjPct);
  let tp2_adj = pricePct(tp2, tpAdjPct);
  let sl_adj = pricePct(sl, slAdjPct);

  // 추가 adj
  const obi = Number(s.obi || s.order_imbalance || 0);
  const adjExtra = clamp(((tbr - 0.5) * 0.002) + (obi * 0.0015), -0.003, 0.003);
  tp1_adj = pricePct(tp1_adj, adjExtra);
  tp2_adj = pricePct(tp2_adj, adjExtra);
  sl_adj = pricePct(sl_adj, -adjExtra * 0.6);

  // 화면셋팅
  setTxt($('#v_price'), fmtKRW(price));
  setTxt($('#v_buy1'), fmtKRW(buy1));
  setTxt($('#v_buy2'), fmtKRW(buy2));
  setTxt($('#v_tp1'), fmtKRW(tp1_adj));
  setTxt($('#v_tp2'), fmtKRW(tp2_adj));
  setTxt($('#v_sl'), fmtKRW(sl_adj));

  const hi1 = s.target_high1 ?? tp1_adj;
  const hi2 = s.target_high2 ?? tp2_adj;
  const lo1 = s.target_low1 ?? sl_adj;
  const retrTo = s.retracement_to ?? buy1;
  const rs1 = s.post_dip_sell1 ?? pricePct(retrTo, +0.012);
  const rs2 = s.post_dip_sell2 ?? pricePct(retrTo, +0.020);
  setTxt($('#v_hi1'), fmtKRW(hi1));
  setTxt($('#v_hi2'), fmtKRW(hi2));
  setTxt($('#v_lo1'), fmtKRW(lo1));
  setTxt($('#v_retr'), fmtKRW(retrTo));
  setTxt($('#v_rs1'), fmtKRW(rs1));
  setTxt($('#v_rs2'), fmtKRW(rs2));

  const z = makeZMsg(s);
  setTxt($('#chip_heat'), z.heat);
  setTxt($('#chip_prob'), `${z.prob}%`);
  setTxt($('#chip_gain'), `+${(+z.gain).toFixed(1)}%`);
  setTxt($('#chip_risk'), s.risk_level != null ? String(s.risk_level) : (z.mode === '불장' ? '2' : (z.mode === '하락장' ? '4' : '3')));

  // 되돌림 보조
  let retr = null;
  if (Array.isArray(s.candles)) retr = computeRetracementFromCandles(s.candles);
  if (s.retracement_percent != null) retr = { R: Number(s.retracement_percent), band: s.retr_band || '' };
  if (!retr && Array.isArray(candles)) retr = computeRetracementFromCandles(candles);
  const pullPrice = (s.retracement_to ?? s.pull_to ?? (retr?.pullTo ?? lo1));
  const retrTxt = retr ? `${Number(retr.R).toFixed(0)}% ${retr.band || ''} (${fmtKRW(pullPrice)}까지)` : `(${fmtKRW(pullPrice)}까지)`;
  setTxt($('#chip_pull'), retrTxt);

  if (hh) setTxt($('#chip_DH'), fmtKRW(hh));
  if (ll) setTxt($('#chip_DL'), fmtKRW(ll));

  setTxt($('#chip_mtf_mode'), mtf.mode);
  setTxt($('#chip_mtf_score'), mtf.mtfScore);
  setTxt($('#chip_adj'), `${(mtf.adj * 100 * (sign ? 1 : 0)).toFixed(2)}%`);

  // 정확도 계산 & 히스토리
  const prec = calcPrecision(s, mtf, atrPct);
  setTxt($('#chip_prec'), `${prec.toFixed(1)}%`);
  const hist = pushPrecisionHistory(prec);
  drawSparkline(hist);
  setGauge($('#gPrec'), $('#tPrec'), prec);

  setTxt($('#z_msg'), z.msg);

  // 3단계 매수 타점
  const recent_high = hh || price;
  const recent_low = ll || price;
  const atrVal = atr || Math.max(1, Math.round(price * 0.01));
  const shortMul = ((rvol >= 2 && tbr >= 0.65) || rvol >= 3) ? 0.25 : (tbr <= 0.45 || rvol <= 0.8) ? 0.6 : 0.4;
  const midMul = ((rvol >= 2 && tbr >= 0.65) || rvol >= 3) ? 1.0 : (tbr <= 0.45 || rvol <= 0.8) ? 1.4 : 1.1;
  const longPct = 0.38;

  let buy_short = roundTick(price - atrVal * shortMul);
  let buy_mid = roundTick(price - atrVal * midMul);
  let buy_long = roundTick(recent_low + (price - recent_low) * longPct);

  if (buy_long > buy_mid) buy_long = buy_mid;
  if (buy_mid > buy_short) buy_mid = buy_short;
  if (buy_short > price) buy_short = roundTick(price * 0.997);

  const tickGap = Math.max(1, upbitTick(price));
  if (price - buy_short < tickGap) buy_short = roundTick(price - tickGap);
  if (buy_short - buy_mid < tickGap) buy_mid = roundTick(buy_short - tickGap);
  if (buy_mid - buy_long < tickGap) buy_long = roundTick(buy_mid - tickGap);

  renderBuyZones({ short: buy_short, mid: buy_mid, long: buy_long, prec, mode: mtf.mode, heat: z.heat, prob: z.prob });

  // Sniper 즉시 갱신
  await refreshSniper(false);

  // 자동 새로고침
  if (ultraTimer) clearInterval(ultraTimer);
  ultraTimer = setInterval(() => openUltra(currentMarket, null), REFRESH_ULTRA_MS);
}

/* ===== buyzone 렌더 & 팝업 ===== */
function renderBuyZones(data) {
  const el = $('#buyzones'); el.innerHTML = '';
  const shortEl = document.createElement('div'); shortEl.className = 'bz good'; shortEl.innerHTML = `단기<br><span class="sub">${fmtKRW(data.short)}</span>`;
  const midEl = document.createElement('div'); midEl.className = 'bz'; midEl.innerHTML = `중기<br><span class="sub">${fmtKRW(data.mid)}</span>`;
  const longEl = document.createElement('div'); longEl.className = 'bz warn'; longEl.innerHTML = `장기<br><span class="sub">${fmtKRW(data.long)}</span>`;
  el.appendChild(shortEl); el.appendChild(midEl); el.appendChild(longEl);

  const popup = $('#bzPopup');
  function showInfo(title, text) {
    setTxt($('#bzTitle'), title);
    setTxt($('#bzText'), text);
    popup.style.display = 'block';
    setTimeout(() => { popup.style.display = 'none'; }, 7000);
  }
  shortEl.onclick = () => showInfo('단기 매수 타점', `가격: ${fmtKRW(data.short)}\n정확도: ${data.prec.toFixed(1)}%\n권장: 스캘프·단타(빠른 반등 기대)`);
  midEl.onclick = () => showInfo('중기 매수 타점', `가격: ${fmtKRW(data.mid)}\n정확도: ${data.prec.toFixed(1)}%\n권장: 분할진입(중기 추세 확인)`);
  longEl.onclick = () => showInfo('장기 매수 타점', `가격: ${fmtKRW(data.long)}\n정확도: ${data.prec.toFixed(1)}%\n권장: 눌림매수·홀딩(장기 관점)`);
}

/* ===== Sniper ===== */
async function refreshSniper(showToast = true) {
  if (!currentMarket) return;
  const d = await jget(`/sniper/point?market=${encodeURIComponent(currentMarket)}`, { retries: 1 });
  if (!d?.ok) { if (showToast) console.warn('sniper_failed'); return; }
  const s = d.sniper || {};
  setTxt($('#sn_low'), fmtKRW(s.ai_low));
  setTxt($('#sn_high'), fmtKRW(s.ai_high));
  setTxt($('#sn_conf'), (s.confidence != null ? s.confidence + '%' : '-'));
  setTxt($('#sn_reason_low'), s.ai_low_reason || '-');
  setTxt($('#sn_reason_high'), s.ai_high_reason || '-');

  const conf = Number(s.confidence) || 0;
  setGauge($('#gConf'), $('#tConf'), clamp(conf, 0, 100));
}

/* ===== 되돌림 보조 ===== */
function computeRetracementFromCandles(candles) {
  try {
    if (!Array.isArray(candles) || candles.length < 10) return null;
    const L = candles.slice(-20);
    let H = -Infinity, Lw = Infinity, C = L[L.length - 1]?.close;
    for (const c of L) { if (c.high > H) H = c.high; if (c.low < Lw) Lw = c.low; }
    if (!(H > Lw) || !isFinite(C)) return null;
    const R = clamp(((H - C) / (H - Lw)) * 100, 0, 100);
    const band = R < 35 ? '얕음' : (R < 65 ? '보통' : '깊음');
    return { R, band, pullTo: roundTick(Lw + (H - Lw) * 0.38) };
  } catch { return null; }
}

/* ===== 검색/오토완성 ===== */
const $q = $('#q'), $btn = $('#btnSearch'), $sug = $('#suggest');

function placeSuggest() { const r = $q.getBoundingClientRect(); $sug.style.left = (window.scrollX + r.left) + 'px'; $sug.style.top = (window.scrollY + r.bottom + 6) + 'px'; $sug.style.width = r.width + 'px'; }
window.addEventListener('resize', placeSuggest); window.addEventListener('scroll', placeSuggest);

function renderSuggest(q) {
  if (!q) { $sug.style.display = 'none'; return; }
  const qq = q.trim().toLowerCase();
  const cand = MARKET_LIST.filter(x => {
    const kn = (x.korean_name || '').toLowerCase();
    const en = (x.english_name || '').toLowerCase();
    const mk = (x.market || '').toLowerCase();
    return kn.includes(qq) || en.includes(qq) || mk.includes(qq);
  }).slice(0, 10);
  $sug.innerHTML = '';
  cand.forEach(x => {
    const row = document.createElement('div'); row.className = 'row';
    row.innerHTML = `<b>${x.korean_name}</b> <span style="opacity:.7">(${x.market.replace('KRW-','')})</span>`;
    row.onclick = () => { $q.value = x.korean_name; $sug.style.display = 'none'; ensureTempSparkCard(x.market); openUltra(x.market, null); setDeepLink(x.market); };
    $sug.appendChild(row);
  });
  placeSuggest();
  $sug.style.display = cand.length ? 'block' : 'none';
}
$q.addEventListener('input', debounce(e => renderSuggest(e.target.value), 120));
document.addEventListener('click', e => { if (e.target !== $q && !$sug.contains(e.target)) $sug.style.display = 'none'; });
document.addEventListener('keydown', e => {
  if (e.key === '/' && document.activeElement !== $q) { e.preventDefault(); $q.focus(); }
  if (e.key === 'Enter' && document.activeElement === $q) { e.preventDefault(); doSearch(); }
});

async function doSearch() {
  const q = $q.value.trim(); if (!q) return;
  await loadMarkets();
  const market = resolveMarket(q);
  if (!market) { alert('코인을 찾을 수 없습니다. (한글/심볼/마켓코드로 검색)'); return; }
  ensureTempSparkCard(market);
  setDeepLink(market);
  openUltra(market, null);
}
$btn.addEventListener('click', doSearch);

function ensureTempSparkCard(market) {
  const listEl = $('#sparkList');
  if (![...listEl.querySelectorAll('.item')].some(x => x.dataset.m === market)) {
    const row = document.createElement('div'); row.className = 'item'; row.dataset.m = market;
    const n = document.createElement('div'); n.className = 'name';
    const kn = (MARKET_LIST.find(x => x.market === market)?.korean_name) || market;
    n.innerHTML = `<b>${kn}</b><small style="color:var(--muted)">${market}</small>`;
    const r = document.createElement('div');
    r.innerHTML = `<div style="text-align:right">-</div>
                 <div class="bar"><span style="width:0%"></span></div>
                 <div class="pillrow" style="justify-content:flex-end"><span class="pill">SPARK 0</span></div>`;
    row.appendChild(n); row.appendChild(r);
    row.addEventListener('click', () => { setDeepLink(market); openUltra(market, null); });
    listEl.prepend(row);
  }
}

/* ===== 글로벌 ===== */
function paintGlobal(idBase, v) {
  const num = $('#g_' + idBase), chg = $('#gc_' + idBase);
  if (!num || !chg || !v) return;
  num.textContent = isFinite(v.close) ? v.close.toLocaleString('en-US', { maximumFractionDigits: 2 }) : '-';
  const sign = v.chg > 0 ? 'up' : v.chg < 0 ? 'down' : '';
  chg.classList.remove('up', 'down'); if (sign) chg.classList.add(sign);
  chg.textContent = isFinite(v.chg) ? `${v.chg > 0 ? '+' : ''}${v.chg.toFixed(2)}%` : '-';
}
async function loadGlobal() {
  const panel = $('#globalPanel');
  let data = null;
  try {
    const d = await fetch(`${API_BASE}/global`, { headers: { accept: 'application/json' } }).then(r => r.json());
    if (d?.ok) data = d.data;
  } catch (e) { }
  if (!data) {
    try {
      const url = 'https://r.jina.ai/http://stooq.com/q/l/?s=%5Endx,%5Espx,dxy,us10y&f=sd2t2ohlcv&h&e=csv';
      const text = await fetch(url).then(r => r.text());
      const lines = text.trim().split(/\r?\n/);
      const out = {};
      for (let i = 1; i < lines.length; i++) {
        const c = lines[i].split(',');
        const sym = (c[0] || '').toLowerCase();
        const close = parseFloat(c[6]), open = parseFloat(c[3]);
        const chg = (isFinite(close) && isFinite(open)) ? ((close - open) / open * 100) : 0;
        out[sym] = { close, open, chg };
      }
      data = out;
    } catch (e) { }
  }
  if (!data) { panel.hidden = true; return; }
  panel.hidden = false;
  paintGlobal('ndx', data['^ndx'] || data['ndx']);
  paintGlobal('spx', data['^spx'] || data['spx']);
  paintGlobal('dxy', data['dxy']);
  paintGlobal('us10y', data['us10y']);
}

/* ===== 딥링크 ===== */
function getDeepLink() { const u = new URL(location.href); return u.searchParams.get('m') || (location.hash || '').replace('#', '') || null; }
function setDeepLink(market) { const u = new URL(location.href); u.searchParams.set('m', market); history.replaceState(null, '', u.toString()); }

/* ===== 부팅 ===== */
(async function boot() {
  await ping().catch(() => { });
  await loadGlobal().catch(() => { });
  await loadMarkets().catch(() => { });

  await renderSpark();
  startSparkAuto();

  const deep = getDeepLink();
  if (deep) { ensureTempSparkCard(deep); openUltra(deep, null); }
  else {
    const first = $('#sparkList .item'); if (first) { first.click(); }
  }

  // 버튼 바인딩
  $('#btnSniper')?.addEventListener('click', () => refreshSniper(true));
  $('#btnCopyLevels')?.addEventListener('click', () => {
    const levels = [
      $('#v_buy1').textContent,
      $('#v_buy2').textContent,
      $('#v_tp1').textContent,
      $('#v_tp2').textContent,
      $('#v_sl').textContent
    ].join(' | ');
    navigator.clipboard?.writeText(levels).then(() => alert('레벨 복사됨: ' + levels));
  });
})();
