/* ============================================================================
   초보자용 안정판 main.js
   - 기존 기능 유지: 검색 요약(현재가/등락/타점/쩔어한마디)
   - 새로운 기능 추가: 스파크 코인(항상 표시, 15초 자동 갱신)
   - 오류 수정: 깜빡임 제거, '불러오는 중' 자동 숨김, 실패해도 표 유지
   ========================================================================== */

/* ========== 유틸 ========== */
const $ = (s) => document.querySelector(s);
const fmtKRW = new Intl.NumberFormat('ko-KR');
const pct = (v) => `${(Number(v) || 0).toFixed(2)}%`;

/* 업비트 KRW 호가단위 */
function tickKRW(p) {
  p = Number(p) || 0;
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
function roundTick(v, dir = 'nearest') {
  const t = tickKRW(v), n = Number(v) / t;
  if (dir === 'up') return Math.ceil(n) * t;
  if (dir === 'down') return Math.floor(n) * t;
  return Math.round(n) * t;
}
function KRW(v) {
  const n = Number(v) || 0;
  return n < 1 ? n.toFixed(4) : fmtKRW.format(Math.round(n));
}
function looksLikeHTML(text) {
  const t = (text || '').trim().toLowerCase();
  return t.startsWith('<!doctype') || t.startsWith('<html');
}

/* ========== 검색 요약 (기존 기능 유지) ========== */
async function loadSummary() {
  try {
    const qEl = $('#q');
    const q = (qEl?.value || 'ETH').trim().toUpperCase();
    const market = q.startsWith('KRW-') ? q : (q.length <= 5 ? `KRW-${q}` : q);

    const res = await fetch(`/api/summary?market=${encodeURIComponent(market)}`, { cache: 'no-store' });
    const text = await res.text();
    if (looksLikeHTML(text)) throw new Error('HTML_RESPONSE');
    const j = JSON.parse(text);
    if (!j.ok) throw new Error(j.error || 'API 오류');

    const price = Number(j.price) || 0;
    const chg = Number(j.change) || 0;

    $('#sym')   && ($('#sym').textContent   = j.symbol || market);
    $('#price') && ($('#price').textContent = KRW(price));
    $('#chg')   && ($('#chg').innerHTML     = chg >= 0 ? `<span style="color:#1ec780">+${pct(chg)}</span>` :
                                                         `<span style="color:#ff5577">${pct(chg)}</span>`);

    // 연습용 타점(호가 반영)
    const buy  = roundTick(price * 0.994, 'nearest');
    const sell = roundTick(price * 1.006, 'nearest');
    const stop = roundTick(price * 0.978, 'nearest');
    $('#buy')  && ($('#buy').textContent  = KRW(buy));
    $('#sell') && ($('#sell').textContent = KRW(sell));
    $('#stop') && ($('#stop').textContent = KRW(stop));

    // 쩔어 한마디(간단)
    let line = '보통 구간: 추세 따라 분할 접근.';
    if ((j.risk || '') === 'danger') line = '변동성 ↑ : 급등락 주의. 분할/짧은 손절 권장.';
    else if ((j.risk || '') === 'caution') line = '주의 구간: 거래량 확인하며 진입.';
    $('#one') && ($('#one').textContent = line);
  } catch (e) {
    $('#one') && ($('#one').textContent = '데이터 로드 실패. 잠시 후 재시도.');
  }
}

/* 이벤트 바인딩 (검색) */
(() => {
  const btn = $('#btn');
  const qEl = $('#q');
  btn && btn.addEventListener('click', loadSummary);
  qEl  && qEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') loadSummary(); });
})();

/* ========== 스파크 (새 기능) ========== */
/* 요구사항:
   - 페이지 접속 시 항상 보임, 15초마다 자동 갱신
   - '불러오는 중...'은 첫 로딩 때만 보이고, 데이터 들어오면 숨김
   - 깜빡임 없이 셀만 교체
   - 새 데이터가 없어도 표 안 비우고 최대 2분 유지(최근감지 라벨)
*/
const SPARK = {
  cache: new Map(),             // market -> { ...item, lastSeen }
  LINGER_MS: 2 * 60 * 1000,     // 24시간 유지
  FIRST_LOADED: false,
  PARAMS: 'minRise=1&minVolRatio=1.2&limit=60' // 보기 좋게 완화 기본값
};

function patchRow(tbody, item) {
  const id = item.market;
  let tr = tbody.querySelector(`tr[data-id="${id}"]`);
  const isStale = !!item._stale;

  const price = Number(item.price) || 0;
  const buy   = roundTick(price * 0.985, 'down'); // -1.5%
  const sell  = roundTick(price * 1.03,  'up');   // +3%
  const stop  = roundTick(price * 0.97,  'down'); // -3%

  const riskObj =
    (item.rise3m > 5) ? { label: '높음', cls: 'danger' } :
    (item.rise3m > 2) ? { label: '보통', cls: 'warn' }   :
                        { label: '낮음',  cls: 'ok'   };

  const msg =
    (item.rise3m > 6) ? '급등 주의! 익절 준비.' :
    (item.rise3m > 3) ? '단타 구간, 추세 유지.'   :
                        '관망 구간, 세력 확인.';

  const name = item.kor || item.market.replace('KRW-', '');
  const time = new Date(item.ts || Date.now()).toLocaleTimeString('ko-KR', { hour12: false });

  const html = `
    <td>${name}</td>
    <td class="val">${KRW(price)}</td>
    <td class="val" style="color:#00e3b2">${KRW(buy)}</td>
    <td class="val" style="color:#ffd166">${KRW(sell)}</td>
    <td class="val" style="color:#ff6b6b">${KRW(stop)}</td>
    <td><span class="badge ${riskObj.cls}">위험도: ${riskObj.label}</span></td>
    <td class="muted">${time}${isStale ? ' · 최근감지' : ''}</td>
    <td class="muted">${msg}</td>
  `;

  if (!tr) {
    tr = document.createElement('tr');
    tr.setAttribute('data-id', id);
    if (isStale) tr.style.opacity = '0.55';
    tr.innerHTML = html;
    tbody.appendChild(tr);
  } else {
    // 깜빡임 없이 셀만 교체
    tr.style.opacity = isStale ? '0.55' : '';
    const temp = document.createElement('tbody');
    temp.innerHTML = `<tr>${html}</tr>`;
    const newTds = temp.querySelectorAll('td');
    const oldTds = tr.querySelectorAll('td');
    newTds.forEach((td, i) => {
      if (oldTds[i] && oldTds[i].innerHTML !== td.innerHTML) {
        oldTds[i].innerHTML = td.innerHTML;
      }
    });
  }
}

function gcStaleRows(tbody) {
  const now = Date.now();
  for (const [k, v] of SPARK.cache) {
    if (now - v.lastSeen > SPARK.LINGER_MS) {
      SPARK.cache.delete(k);
      const tr = tbody.querySelector(`tr[data-id="${k}"]`);
      tr && tr.remove();
    }
  }
}

async function loadSpark() {
  const msg  = $('#loading-msg');  // 첫 로딩 안내 메시지 (선택)
  const body = $('#spark-body');   // 스파크 표 tbody
  if (!body) return;               // 섹션이 없으면 스킵

  if (!SPARK.FIRST_LOADED && msg) msg.style.display = 'block';

  try {
    const res = await fetch(`/api/spark?${SPARK.PARAMS}`, { cache: 'no-store' });
    const j = await res.json();

    const now = Date.now();
    if (j.ok && Array.isArray(j.items)) {
      // 새 데이터 캐시에 반영
      j.items.forEach(it => {
        const prev = SPARK.cache.get(it.market) || {};
        SPARK.cache.set(it.market, { ...prev, ...it, lastSeen: now });
      });

      // 캐시에 있는 항목들을 최신순으로 렌더
      const list = Array.from(SPARK.cache.values())
        .sort((a, b) => (b.lastSeen - a.lastSeen) || (b.rise3m - a.rise3m));

      list.forEach(it => {
        const _stale = (now - it.lastSeen > 15 * 1000); // 이번 fetch에서 안 잡혔으면 '최근감지'
        patchRow(body, { ...it, _stale });
      });

      // 오래된 항목 제거(표는 비우지 않음)
      gcStaleRows(body);
    }

    // 첫 로딩 메시지는 데이터가 1개라도 있으면 숨김
    if (!SPARK.FIRST_LOADED && msg) {
      if (SPARK.cache.size > 0) {
        msg.style.display = 'none';
        SPARK.FIRST_LOADED = true;
      } else {
        msg.textContent = '현재 포착된 스파크 코인이 없습니다.';
      }
    }
  } catch (e) {
    // 실패해도 표는 유지(깜빡임 방지). 첫 로딩만 안내.
    if (!SPARK.FIRST_LOADED && msg) msg.textContent = '스파크 데이터 불러오기 실패';
  }
}

/* ========== 온체인 (있을 때만 동작) ========== */
async function pingOnchain(symbol = 'ETH') {
  const badge = $('#oc-badge');     // 선택 요소
  const flow  = $('#onchain-flow'); // 선택 요소
  if (!badge && !flow) return;

  try {
    badge && (badge.textContent = '온체인: 확인중…');
    const r = await fetch(`/api/onchain?symbol=${symbol}`, { cache: 'no-store' });
    const j = await r.json();
    if (!j.ok) throw new Error(j.error || 'onchain fail');

    if (badge) { badge.textContent = '온체인: 연결됨'; badge.className = 'badge ok'; }
    if (flow) {
      let txt = '데이터 없음';
      if (j.stable && j.stable.change24hUSD != null) {
        const v = Number(j.stable.change24hUSD);
        const sign = v > 0 ? '+' : '';
        txt = `${sign}${v.toLocaleString()} USD / 24h`;
      }
      flow.textContent = txt;
    }
  } catch (e) {
    if (badge) { badge.textContent = '온체인: 오류'; badge.className = 'badge danger'; }
    if (flow) flow.textContent = '오류';
  }
}

/* ========== 초기 구동 ========== */
window.addEventListener('load', () => {
  // 기본 검색어 세팅(있으면)
  const qEl = $('#q');
  if (qEl && !qEl.value) qEl.value = 'ETH';

  // 기존 기능: 요약 1회 로드
  loadSummary();

  // 새 기능: 스파크 항상 표시 + 15초마다 부드럽게 갱신
  loadSpark();
  setInterval(loadSpark, 15000);

  // 온체인(선택)
  pingOnchain('ETH');
});
