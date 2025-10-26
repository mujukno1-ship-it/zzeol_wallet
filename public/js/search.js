// public/js/search.js
import { getPremium } from './api.js';
import { /* 필요하면 getOnchain */ } from './api.js';

const input = document.getElementById('search-input');
const clearBtn = document.getElementById('search-clear');

async function search(symbolKoOrEn) {
  // 간단 매핑: 한글 → 티커 (필요 시 확장)
  const map = { '비트코인':'BTC', '이더리움':'ETH', '리플':'XRP' };
  const symbol = map[symbolKoOrEn.trim()] || symbolKoOrEn.toUpperCase();

  try {
    const p = await getPremium(symbol);
    document.querySelector('#kimchi .pct').textContent = `${(p.premiumPct ?? 0).toFixed(2)}%`;
    document.querySelector('#kimchi .upbit').textContent = p.upbitPrice?.toLocaleString() + ' ₩';
    document.getElementById('updated').textContent = new Date().toLocaleString();
  } catch (e) {
    console.error(e);
  }
}

input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') search(input.value);
});

clearBtn.addEventListener('click', () => {
  input.value = '';
  input.focus();
});
