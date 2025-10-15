// public/js/utils.js — 모듈 없이 브라우저에서 바로 쓰는 유틸

// 숫자 → 원화 포맷 (null/NaN 방어)
function formatKRW(v) {
  const n = Number(v);
  if (!isFinite(n)) return '-';
  return n.toLocaleString('ko-KR');
}

// 위험도 뱃지(1이 가장 안전)
function riskTag(r) {
  const n = Number(r);
  const cls =
    n === 1 ? 'tag good' :
    n === 2 ? 'tag' :
    n === 3 ? 'tag warn' : 'tag danger';
  const label = `위험도 ${n}`;
  return `<span class="${cls}">${label}</span>`;
}

// HTML 이스케이프(표에 넣을 때 안전)
function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
