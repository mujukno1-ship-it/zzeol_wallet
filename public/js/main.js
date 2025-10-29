/* ===============================
 * 🔍 검색 강화 (한글/영문 + 자동선택)
 * 대상 엘리먼트: #q 또는 #search-input / #spark 또는 #spark-list
 * =============================== */

// 엘리먼트 참조 (이름이 다른 버전도 대응)
const $q     = document.getElementById('q') || document.getElementById('search-input');
const $spark = document.getElementById('spark') || document.getElementById('spark-list');

// SPARK 카드들을 캐시 (DOM 기반)
let SPARK_CACHE = [];   // [{el, market, kname, text}]
function cacheSparkCards() {
  if (!$spark) return;
  const cards = $spark.querySelectorAll('[data-market], .coin, .spark-item');
  SPARK_CACHE = Array.from(cards).map(el => {
    const market = el.getAttribute('data-market') || (el.querySelector('.sym')?.textContent?.trim()) || '';
    const kname  = (el.querySelector('.kname')?.textContent?.trim()) || '';
    const text   = `${market} ${kname}`.toLowerCase();
    return { el, market, kname, text };
  });
}

// 결과 없을 때 안내 표시
function showEmptyMsg(msg) {
  let box = document.getElementById('empty-msg');
  if (!box) {
    box = document.createElement('div');
    box.id = 'empty-msg';
    box.style.textAlign = 'center';
    box.style.color = '#9fb2c8';
    box.style.padding = '14px';
    box.style.border = '1px dashed #2c3d52';
    box.style.borderRadius = '10px';
    $spark?.appendChild(box);
  }
  box.textContent = msg;
}
function hideEmptyMsg() {
  const box = document.getElementById('empty-msg');
  if (box) box.remove();
}

// 첫 결과 자동 선택 → ULTRA 갱신
function autoSelectFirst(matched) {
  const first = matched[0];
  if (!first) return;

  // 1) selectUltra(item) 함수가 있는 버전
  if (typeof window.selectUltra === 'function' && Array.isArray(window.LAST_SPARK)) {
    const item = window.LAST_SPARK.find(x => x.market === first.market);
    if (item) window.selectUltra(item);
  } else {
    // 2) 카드 클릭을 트리거(다른 버전 호환)
    first.el.click?.();
  }
}

// 디바운스 헬퍼
function debounce(fn, ms=120){ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), ms); }; }

// 검색 이벤트
const onSearch = debounce(() => {
  if (!$spark || !$q) return;
  const q = $q.value.trim().toLowerCase();

  // 검색어 없으면 전체 복원
  if (!q) {
    hideEmptyMsg();
    SPARK_CACHE.forEach(({el}) => el.style.display = '');
    // 리스트가 비어있지 않으면 첫 카드 자동선택(선택사항)
    const visible = SPARK_CACHE.filter(c => c.el.style.display !== 'none');
    if (visible.length) autoSelectFirst(visible);
    return;
  }

  // 필터링: market, 한글명 모두 검색
  const matched = [];
  SPARK_CACHE.forEach(item => {
    const ok = item.text.includes(q);
    item.el.style.display = ok ? '' : 'none';
    if (ok) matched.push(item);
  });

  // 결과 처리
  if (!matched.length) {
    showEmptyMsg(`❌ '${$q.value}' 결과가 없습니다. (현재 TOP10에 없을 수 있어요)`);
  } else {
    hideEmptyMsg();
    autoSelectFirst(matched);
  }
}, 80);

// 초기 세팅
window.addEventListener('load', () => {
  cacheSparkCards();
  // SPARK 목록이 주기적으로 갱신되는 경우를 대비해서 1초마다 재캐시(가벼움)
  setInterval(cacheSparkCards, 1000);
});
$q?.addEventListener('input', onSearch);
