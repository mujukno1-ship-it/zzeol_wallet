// ====================================================
// 쩔어지갑 v9.2 — 실시간 업비트 연동 + 급등감지(AI) + WS→REST 자동복구
// ====================================================

// ---------- 기본 설정 ----------
const baseMarket = "KRW";
let ws = null;
let currentCode = null;
let USE_MOCK = false;
let USE_REST = false;
let WS_FAILS = 0;
let restTickerTimer = null;
let restOrderbookTimer = null;
const el = {};
const codeMap = {};

// ---------- DOM 캐시 ----------
window.addEventListener("DOMContentLoaded", () => {
  el.ws = document.getElementById("ws-status");
  el.price = document.getElementById("price");
  el.table = document.getElementById("price-table");
  el.listBody = document.getElementById("coin-list-body");
});

// ---------- 유틸 ----------
function fmtKRW(v) {
  if (!v) return "-";
  return Number(v).toLocaleString("ko-KR");
}
function upbitTick(price) {
  if (price >= 1000000) return 1000;
  if (price >= 100000) return 500;
  if (price >= 10000) return 100;
  if (price >= 1000) return 10;
  if (price >= 100) return 1;
  if (price >= 10) return 0.1;
  if (price >= 1) return 0.01;
  return 0.001;
}

// ---------- REST 백업 ----------
function clearRestLoop() {
  if (restTickerTimer) clearInterval(restTickerTimer);
  if (restOrderbookTimer) clearInterval(restOrderbookTimer);
}
async function restFetchTicker(code) {
  try {
    const r = await fetch(`https://api.upbit.com/v1/ticker?markets=${code}`);
    const js = await r.json();
    const t = js && js[0];
    if (!t) return;
    renderTicker(t);
  } catch (_) {}
}
async function restFetchOrderbook(code) {
  try {
    const r = await fetch(`https://api.upbit.com/v1/orderbook?markets=${code}`);
    const js = await r.json();
    const ob = js && js[0];
    if (!ob) return;
    renderOrderbook(ob);
  } catch (_) {}
}
function startRestLoop(code) {
  clearRestLoop();
  if (!code) return;
  document.getElementById("ws-status").textContent =
    "REST 모드(웹소켓 차단) — 2~3초 갱신";
  restTickerTimer = setInterval(() => restFetchTicker(code), 2000);
  restOrderbookTimer = setInterval(() => restFetchOrderbook(code), 3000);
  restFetchTicker(code);
  restFetchOrderbook(code);
}

// ---------- WebSocket ----------
function openWS(codes) {
  if (USE_MOCK) return;
  if (USE_REST) return startRestLoop(codes && codes[0]);

  if (ws) try { ws.close(); } catch (_) {}
  ws = new WebSocket("wss://api.upbit.com/websocket/v1");
  ws.binaryType = "arraybuffer";

  ws.onopen = () => {
    WS_FAILS = 0;
    clearRestLoop();
    el.ws.textContent = "실시간 연결됨";
    ws.send(
      JSON.stringify([
        { ticket: "zzeol" },
        { type: "ticker", codes },
        { type: "orderbook", codes },
      ])
    );
  };

  ws.onclose = () => {
    WS_FAILS++;
    el.ws.textContent = "연결 종료 — 재시도 중...";
    if (WS_FAILS >= 2) {
      USE_REST = true;
      startRestLoop(codes && codes[0]);
      return;
    }
    setTimeout(() => openWS(codes), 1200);
  };

  ws.onerror = () => {
    WS_FAILS++;
    el.ws.textContent = "연결 오류";
    if (WS_FAILS >= 2) {
      USE_REST = true;
      startRestLoop(codes && codes[0]);
    }
  };

  ws.onmessage = (ev) => {
    const data = new TextDecoder("utf-8").decode(ev.data);
    try {
      const t = JSON.parse(data);
      if (t && t.code && t.trade_price !== undefined) renderTicker(t);
      else if (t && t.code && t.orderbook_units) renderOrderbook(t);
    } catch (_) {}
  };
}

// ---------- 렌더 ----------
function renderTicker(t) {
  document.getElementById("price").textContent = fmtKRW(t.trade_price);
}
function renderOrderbook(ob) {
  // 필요 시 호가표 업데이트 코드 유지
}

// ---------- 선택 ----------
function selectCode(code) {
  if (!code) return;
  currentCode = code;
  if (USE_REST) return startRestLoop(code);
  openWS([code]);
}

// ---------- 급등감지 (AI) ----------
const priceHist = {};
function recordHistory(tmap) {
  const now = Date.now();
  Object.keys(tmap).forEach((c) => {
    const t = tmap[c];
    if (!t) return;
    const arr = priceHist[c] || (priceHist[c] = []);
    arr.push({ t: now, price: t.trade_price, acc: t.acc_trade_price_24h });
    const cutoff = now - 20 * 60 * 1000;
    while (arr.length && arr[0].t < cutoff) arr.shift();
  });
}
function pct(code, min) {
  const arr = priceHist[code];
  if (!arr || arr.length < 2) return 0;
  const now = Date.now();
  const tgt = now - min * 60000;
  let base = arr[0];
  for (let i = 0; i < arr.length; i++) {
    if (arr[i].t >= tgt) {
      base = arr[i];
      break;
    }
  }
  const p0 = base.price || 0,
    p1 = arr[arr.length - 1].price || 0;
  return p0 ? ((p1 / p0 - 1) * 100) : 0;
}
function inflow(code, min = 3) {
  const arr = priceHist[code];
  if (!arr || arr.length < 2) return 0;
  const now = Date.now();
  const tgt = now - min * 60000;
  let base = arr[0];
  for (let i = 0; i < arr.length; i++) {
    if (arr[i].t >= tgt) {
      base = arr[i];
      break;
    }
  }
  const last = arr[arr.length - 1];
  const dv = last.acc - base.acc;
  const dt = Math.max(0.1, (last.t - base.t) / 60000);
  return dv / dt;
}
function pumpScore(p1, p3, p5, inf) {
  let s = 0;
  s += Math.max(0, p1) * 2.2;
  s += Math.max(0, p3) * 1.4;
  s += Math.max(0, p5) * 1.0;
  s += Math.min(5, (inf / 1_000_000_000) * 1.8);
  if (p1 > 7 && p3 < 9) s -= 2;
  return s;
}
function pumpLevel(s, p5) {
  if (s >= 18 || p5 >= 10) return { label: "초급등", cls: "lvl-hyper" };
  if (s >= 9 || p5 >= 5) return { label: "급등", cls: "lvl-pump" };
  return { label: "예열", cls: "lvl-warm" };
}
function renderPump(rows) {
  const tb = document.getElementById("pump-body");
  if (!tb) return;
  tb.innerHTML = "";
  if (!rows.length)
    return (tb.innerHTML = `<tr><td colspan="9">감지 없음</td></tr>`);
  rows.forEach((r, i) => {
    const info = codeMap[r.code] || { korean_name: r.code, english_name: "" };
    const lv = pumpLevel(r.score, r.pc5);
    tb.innerHTML += `
      <tr>
        <td>${i + 1}</td>
        <td>${r.code}</td>
        <td>${info.korean_name}</td>
        <td>${fmtKRW(r.price)}</td>
        <td class="${r.pc1 >= 0 ? "up" : "down"}">${r.pc1.toFixed(2)}%</td>
        <td class="${r.pc3 >= 0 ? "up" : "down"}">${r.pc3.toFixed(2)}%</td>
        <td class="${r.pc5 >= 0 ? "up" : "down"}">${r.pc5.toFixed(2)}%</td>
        <td>${Math.round(r.inflow).toLocaleString()} KRW/분</td>
        <td><span class="lvl-badge ${lv.cls}">${lv.label}</span></td>
      </tr>`;
  });
}
<!-- JS 경로 자동복구 로더 (한방 붙여넣기) -->
<script>
  (function () {
    var statusEl = document.getElementById('ws-status');
    if (statusEl) statusEl.textContent = '초기화중... (로더)';

    function load(src, onOk, onFail) {
      var s = document.createElement('script');
      s.src = src + (src.indexOf('?')>-1 ? '' : '?v=20250218'); // 캐시무효화
      s.defer = true;
      s.onload = onOk;
      s.onerror = onFail;
      document.body.appendChild(s);
    }

    // 1차: /js 경로
    load('/js/zzeol_app.js', function () {
      if (statusEl) statusEl.textContent = 'REST 모드(강제) — 1~2초 갱신';
    }, function () {
      // 2차: /public/js 경로로 자동 폴백
      load('/public/js/zzeol_app.js', function () {
        if (statusEl) statusEl.textContent = 'REST 모드(강제) — 1~2초 갱신';
      }, function () {
        // 3차: 완전 실패 → 안내 문구
        if (statusEl) statusEl.textContent = 'JS 로딩 실패(/js, /public/js 모두 404). 경로 확인 필요';
      });
    });
  })();
</script>
