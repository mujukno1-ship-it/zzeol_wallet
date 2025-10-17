// /js/entry.zzeol_live.js
(function () {
  const $ = (sel) => document.querySelector(sel);
  const warmBox = $('#warmup-box');
  const surgeBox = $('#surge-box');
  const signalBox = $('#signal-box');
  const lastUpdated = $('#last-updated');
  const refreshBtn = $('#btn-refresh');
  const warmCount = $('#warm-count');
  const surgeCount = $('#surge-count');
  const signalCount = $('#signal-count');

  // ----- 데이터 로더 (기존 API/데이터 소스 그대로 사용) -----
  // 아래는 예시입니다. 이미 fetch 경로/함수 있으면 그걸로 바꿔주세요.
  async function fetchWarmup() {
    // e.g. return fetch('/data/warmup.json').then(r => r.json());
    // 또는 기존 전역 함수 호출: return window.loadWarmup();
    return window.loadWarmup ? window.loadWarmup() : [];
  }

  async function fetchSurge() {
    return window.loadSurge ? window.loadSurge() : [];
  }

  async function fetchSignals() {
    return window.loadSignals ? window.loadSignals() : [];
  }

  // ----- 렌더 (기존 파일에서 노출한 함수 사용) -----
  function renderWarm(list) {
    if (window.renderWarmup) {
      window.renderWarmup(list, { mount: warmBox });
    } else {
      warmBox.innerHTML = tableFallback(list, ['심볼', '가격', '변동률'], (r) => `
        <tr>
          <td>${r.symbol ?? '-'}</td>
          <td>${fmt(r.price)}</td>
          <td class="${r.change >= 0 ? 'pos':'neg'}">${fmtPct(r.change)}</td>
        </tr>
      `);
    }
    warmCount.textContent = `${list?.length ?? 0} 종목`;
  }

  function renderSurge(list) {
    if (window.renderSurge) {
      window.renderSurge(list, { mount: surgeBox });
    } else {
      surgeBox.innerHTML = tableFallback(list, ['심볼', '3분', '15분', '1시간'], (r) => `
        <tr>
          <td>${r.symbol ?? '-'}</td>
          <td class="${r.m3 >= 0 ? 'pos':'neg'}">${fmtPct(r.m3)}</td>
          <td class="${r.m15 >= 0 ? 'pos':'neg'}">${fmtPct(r.m15)}</td>
          <td class="${r.h1 >= 0 ? 'pos':'neg'}">${fmtPct(r.h1)}</td>
        </tr>
      `);
    }
    surgeCount.textContent = `${list?.length ?? 0} 종목`;
  }

  function renderSig(list) {
    if (window.renderSignals) {
      window.renderSignals(list, { mount: signalBox });
    } else {
      signalBox.innerHTML = tableFallback(list, ['시간', '심볼', '타입', '근거'], (r) => `
        <tr>
          <td>${fmtTime(r.ts)}</td>
          <td>${r.symbol ?? '-'}</td>
          <td>${r.type ?? '-'}</td>
          <td>${r.reason ?? '-'}</td>
        </tr>
      `);
    }
    signalCount.textContent = `${list?.length ?? 0} 신호`;
  }

  // ----- 공통 새로고침 -----
  async function refreshAll() {
    refreshBtn.disabled = true;
    try {
      const [w, s, g] = await Promise.all([fetchWarmup(), fetchSurge(), fetchSignals()]);
      renderWarm(w || []);
      renderSurge(s || []);
      renderSig(g || []);
      lastUpdated.textContent = `업데이트: ${new Date().toLocaleTimeString()}`;
    } catch (e) {
      console.error(e);
      lastUpdated.textContent = '업데이트 실패';
    } finally {
      refreshBtn.disabled = false;
    }
  }

  refreshBtn.addEventListener('click', refreshAll);

  // 최초 로딩 + 주기적 갱신(필요시 조정)
  refreshAll();
  setInterval(refreshAll, 30_000);

  // ---- fallback helpers ----
  function tableFallback(list, headers, rowTmpl) {
    const header = `<tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>`;
    const rows = (list ?? [])
      .map(rowTmpl)
      .join('') || `<tr><td colspan="${headers.length}" style="text-align:center;color:#6a8">데이터 없음</td></tr>`;
    return `<table>${header}${rows}</table>`;
  }
  const fmt = (v) => (v == null ? '-' : Number(v).toLocaleString());
  const fmtPct = (v) => (v == null ? '-' : `${(Number(v) * 100).toFixed(2)}%`);
  const fmtTime = (ts) => ts ? new Date(ts).toLocaleTimeString() : '-';
})();
