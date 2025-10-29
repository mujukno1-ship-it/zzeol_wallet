/* =========================================================
   사토시의지갑 — v12 연결 한방 스크립트 (기존기능유지+연동+오류보정)
   - API: satoshi-proxy (Cloudflare Workers)
   - KRW 전용 / 업비트 호가틱 반올림 / 한글코인명 표시
   - SPARK TOP10 + ULTRA 시그널 + 쩔어한마디(분석형)
   - No-Motion 업데이트 (변경된 숫자만 교체)
========================================================= */

/** 0) 기본 설정 */
const API_BASE = "https://satoshi-proxy.mujukno1.workers.dev/api";
const NO_MOTION = true; // 화면 깜빡임 방지
const STATE = {
  markets: [],         // [{market:'KRW-XXX', korean_name:'이름', ...}]
  marketsByCode: {},   // 'KRW-XXX' -> obj
  selected: null,      // 'KRW-XXX'
  timers: []
};

/** 1) 유틸 */
const $ = (sel, root = document) => root.querySelector(sel);
function ensureBox(id, title, parentSel) {
  let box = document.getElementById(id);
  if (!box) {
    const parent = $(parentSel) || document.body;
    box = document.createElement("section");
    box.id = id;
    box.style.margin = "14px 0";
    box.innerHTML = `
      <div style="background:#0f1115;border:1px solid #1f2330;border-radius:10px;padding:16px;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
          <span style="font-size:18px">${title}</span>
          <span id="${id}-meta" style="opacity:.6;font-size:12px"></span>
        </div>
        <div id="${id}-content"></div>
      </div>`;
    parent.appendChild(box);
  }
  return {
    root: box,
    meta: document.getElementById(`${id}-meta`),
    content: document.getElementById(`${id}-content`)
  };
}
function setText(el, text) {
  if (!el) return;
  if (NO_MOTION) {
    if (el.textContent !== String(text)) el.textContent = String(text);
  } else el.textContent = String(text);
}
function krw(x) {
  if (x == null || isNaN(x)) return "-";
  return Number(x).toLocaleString("ko-KR") + "원";
}

/** 업비트 호가틱 단위 (KRW) */
function upbitTick(price) {
  price = Number(price);
  if (price >= 2000000) return 1000;
  if (price >= 1000000) return 500;
  if (price >= 500000)  return 100;
  if (price >= 100000)  return 50;
  if (price >= 10000)   return 10;
  if (price >= 1000)    return 1;
  if (price >= 100)     return 0.1;
  if (price >= 10)      return 0.01;
  return 0.001; // 저가코인
}
function roundTick(price) {
  const t = upbitTick(price);
  return Math.round(price / t) * t;
}

/** 2) DOM 섹션 확보 (기존 섹션 있으면 그대로 사용) */
const ui = {
  search: (() => {
    // 검색바가 이미 있으면 그대로 사용, 없으면 생성
    let bar = $("#satoshi-search-bar");
    if (!bar) {
      const host = ensureBox("satoshi-search", "🔎 검색 (KRW 전용)", "body");
      host.content.innerHTML = `
        <div style="display:flex;gap:8px;">
          <input id="satoshi-search-input" placeholder="코인 이름 또는 심볼 입력… (예: 시바이누, ETH)" 
                 style="flex:1;background:#0b0d12;border:1px solid #23283a;border-radius:10px;padding:10px 12px;color:#cbd5e1"/>
          <button id="satoshi-search-btn" style="padding:10px 14px;border-radius:10px;border:1px solid #23283a;background:#151a25;color:#cbd5e1">검색</button>
        </div>
        <div id="satoshi-search-list" style="margin-top:10px;display:flex;flex-direction:column;gap:6px"></div>
      `;
      bar = host.root;
    }
    return {
      input: $("#satoshi-search-input"),
      btn: $("#satoshi-search-btn"),
      list: $("#satoshi-search-list"),
      meta: $("#satoshi-search-meta")
    };
  })(),
  spark: ensureBox("satoshi-spark", "🔥 SPARK TOP10 — 급등 사전 예열 감지", "body"),
  ultra: ensureBox("satoshi-ultra", "⚡ ULTRA 시그널 — 선택한 코인", "body"),
};

/** 3) API */
async function jget(path) {
  const url = `${API_BASE}${path}`;
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

/** 4) 마켓 로딩 */
async function loadMarkets() {
  const data = await jget("/markets");
  const onlyKRW = (data.items || data || []).filter(x => /^KRW-/.test(x.market));
  STATE.markets = onlyKRW;
  STATE.marketsByCode = Object.fromEntries(onlyKRW.map(x => [x.market, x]));
  ui.search.meta && setText(ui.search.meta, `총 ${onlyKRW.length}개`);
}

/** 5) 검색 */
function renderSearch(list) {
  const el = ui.search.list;
  if (!el) return;
  el.innerHTML = "";
  list.slice(0, 10).forEach(x => {
    const row = document.createElement("div");
    row.style.cssText = "display:flex;justify-content:space-between;align-items:center;background:#0b0d12;border:1px solid #1f2330;border-radius:10px;padding:10px 12px";
    row.innerHTML = `
      <div style="display:flex;flex-direction:column">
        <b style="color:#e2e8f0">${x.korean_name}</b>
        <span style="opacity:.65;font-size:12px">${x.market} / ${x.english_name || ""}</span>
      </div>
      <button data-market="${x.market}" style="padding:8px 12px;border-radius:10px;border:1px solid #273044;background:#141a24;color:#cbd5e1">선택</button>
    `;
    el.appendChild(row);
  });
  el.querySelectorAll("button[data-market]").forEach(b=>{
    b.onclick = () => {
      const m = b.getAttribute("data-market");
      selectMarket(m);
    };
  });
}
function onSearch() {
  const q = (ui.search.input?.value || "").trim();
  if (!q) {
    renderSearch([]);
    return;
  }
  const lc = q.toLowerCase();
  const result = STATE.markets.filter(x =>
    x.korean_name?.includes(q) ||
    x.market?.toLowerCase().includes(lc) ||
    x.english_name?.toLowerCase().includes(lc)
  );
  renderSearch(result);
}

/** 6) SPARK TOP10 */
async function loadSpark() {
  try {
    const data = await jget("/spark/top10");
    drawSpark(data.items || []);
  } catch {
    // 백엔드가 아직 SPARK 비어있으면 간단 플레이스홀더
    drawSpark([]);
  }
}
function drawSpark(items) {
  const box = ui.spark.content;
  if (!box) return;
  if (!items.length) {
    box.innerHTML = `<div style="opacity:.7">예열 데이터 없음 (잠시 후 자동 재시도)</div>`;
    return;
  }
  box.innerHTML = items.map(it => {
    const nm = STATE.marketsByCode[it.market]?.korean_name || it.market;
    const score = Math.round((it.spark_score ?? it.score ?? 0) * 100) / 100;
    return `
      <div style="display:flex;justify-content:space-between;align-items:center;background:#0b0d12;border:1px solid #1f2330;border-radius:10px;padding:10px 12px;margin-bottom:6px">
        <div>
          <b>${nm}</b><span style="opacity:.6;margin-left:8px">${it.market}</span>
          <div style="opacity:.65;font-size:12px">예열강도: ${score ?? 0}</div>
        </div>
        <button data-go="${it.market}" style="padding:8px 12px;border-radius:10px;border:1px solid #273044;background:#141a24;color:#cbd5e1">선택</button>
      </div>`;
  }).join("");
  ui.spark.content.querySelectorAll("button[data-go]").forEach(b=>{
    b.onclick = () => selectMarket(b.getAttribute("data-go"));
  });
}

/** 7) ULTRA 시그널 */
async function loadUltra(market) {
  const box = ui.ultra.content;
  if (!box) return;
  box.innerHTML = `<div style="opacity:.7">불러오는 중…</div>`;
  try {
    const sig = await jget(`/ultra/signal?market=${encodeURIComponent(market)}`);
    drawUltra(market, sig);
  } catch (e) {
    box.innerHTML = `<div style="color:#f87171">ULTRA 오류: ${e.message}</div>`;
  }
}
function drawUltra(market, sig) {
  const M = STATE.marketsByCode[market];
  const name = M?.korean_name || market;
  const now = Number(sig.price || 0);
  const risk = sig.risk ?? 3;

  // 업비트 호가틱 반올림
  const buy1 = roundTick(sig.buy1 || 0);
  const buy2 = roundTick(sig.buy2 || 0);
  const tp1  = roundTick(sig.tp1  || 0);
  const tp2  = roundTick(sig.tp2  || 0);
  const sl   = roundTick(sig.sl   || 0);

  // 쩔어멘트 (분석형 — 간단 규칙 버전 / 수치 있으면 강화)
  let ment = sig.comment || "signal skeleton";
  if (now && tp1 && sl) {
    const expGain = ((tp1 - now) / Math.max(1, now)) * 100;
    const expLoss = ((now - sl) / Math.max(1, now)) * 100;
    const rise = expGain.toFixed(1), fall = expLoss.toFixed(1);
    if (expGain >= 15 && (sig.forceIndex >= 80 || sig.spark_score >= 80)) {
      ment = `🔥 세력 분출 직전 — 예열강도 ${Math.round(sig.spark_score||0)} / 상승확률 높음 / 예상상승률 +${rise}%`;
    } else if (expLoss >= 5 && (sig.forceIndex <= 35)) {
      ment = `⚠ 하락 위험 — 빠른 청산 권장 / 예상하락률 −${fall}%`;
    } else {
      ment = `예상상승률 +${rise}% / 예상하락률 −${fall}% — ${sig.forceIndex ? `세력지수 ${sig.forceIndex}` : '관망'}`;
    }
  }

  ui.ultra.content.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px">
      <div style="grid-column:1/-1;display:flex;justify-content:space-between;align-items:center;background:#0b0d12;border:1px solid #1f2330;border-radius:10px;padding:10px 12px;">
        <div><b>${name}</b><span style="opacity:.6;margin-left:8px">${market}</span></div>
        <button id="ultra-refresh" style="padding:6px 10px;border-radius:8px;border:1px solid #273044;background:#141a24;color:#cbd5e1">새로고침</button>
      </div>
      <div class="card">
        <div class="k">현재가</div><div class="v" id="u-now">${krw(now)}</div>
      </div>
      <div class="card">
        <div class="k">위험도</div><div class="v" id="u-risk">${risk}</div>
      </div>
      <div class="card">
        <div class="k">매수(BUY1)</div><div class="v">${buy1?krw(buy1):"-"}</div>
      </div>
      <div class="card">
        <div class="k">매수(BUY2)</div><div class="v">${buy2?krw(buy2):"-"}</div>
      </div>
      <div class="card">
        <div class="k">익절(TP1)</div><div class="v">${tp1?krw(tp1):"-"}</div>
      </div>
      <div class="card">
        <div class="k">익절(TP2)</div><div class="v">${tp2?krw(tp2):"-"}</div>
      </div>
      <div class="card">
        <div class="k">손절(SL)</div><div class="v" style="color:#f87171">${sl?krw(sl):"-"}</div>
      </div>
      <div style="grid-column:1/-1;background:#0b0d12;border:1px solid #1f2330;border-radius:10px;padding:10px 12px;">
        <div style="opacity:.7;font-size:12px;margin-bottom:6px">쩔어한마디</div>
        <div id="u-ment">${ment}</div>
      </div>
    </div>
    <style>
      #satoshi-ultra .card{background:#0b0d12;border:1px solid #1f2330;border-radius:10px;padding:10px 12px}
      #satoshi-ultra .k{opacity:.65;font-size:12px;margin-bottom:6px}
      #satoshi-ultra .v{font-weight:700}
    </style>
  `;
  const btn = $("#ultra-refresh", ui.ultra.content);
  if (btn) btn.onclick = () => loadUltra(market);
}

/** 8) 선택 */
function selectMarket(market) {
  STATE.selected = market;
  loadUltra(market);
  // 검색결과 접기
  if (ui.search.list) ui.search.list.innerHTML = "";
}

/** 9) 초기화 */
async function initSatoshi() {
  try {
    // 헬스체크(선택)
    try { await jget("/health"); } catch {}
    await loadMarkets();
    await loadSpark();

    // 기본: 검색 이벤트
    if (ui.search.btn) ui.search.btn.onclick = onSearch;
    if (ui.search.input) ui.search.input.onkeydown = e => { if (e.key === "Enter") onSearch(); };

    // 첫 진입 시 SPARK 첫 항목 자동 선택 (있다면)
    const first = ui.spark.content?.querySelector("button[data-go]")?.getAttribute("data-go");
    if (first) selectMarket(first);
  } catch (e) {
    ui.ultra.content.innerHTML = `<div style="color:#f87171">초기화 오류: ${e.message}</div>`;
  }

  // 주기 갱신(가벼운 주기, 필요시 조정)
  clearTimers();
  STATE.timers.push(setInterval(loadSpark, 30_000));
  if (STATE.selected) STATE.timers.push(setInterval(()=>loadUltra(STATE.selected), 20_000));
}
function clearTimers() {
  STATE.timers.forEach(t => clearInterval(t));
  STATE.timers = [];
}

// 바로 실행
initSatoshi();
