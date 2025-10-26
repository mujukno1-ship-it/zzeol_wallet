// public/js/main.js
import { getPremium, getOnchain, ping } from './api.js';

const $ = (sel) => document.querySelector(sel);

async function renderAll(symbol = 'BTC') {
  try {
    // 김프
    const p = await getPremium(symbol);
    $('#kimchi .pct').textContent = `${(p.premiumPct ?? 0).toFixed(2)}%`;
    $('#kimchi .upbit').textContent = p.upbitPrice?.toLocaleString() + ' ₩';
    $('#kimchi .usdkrw').textContent = p.usdrw?.toLocaleString();
    $('#kimchi .src').textContent = 'CoinGecko / open.er-api.com / Upbit';

    // 온체인
    const o = await getOnchain('ETH');
    $('#onchain .tvl').textContent = Number(o.tvl || 0).toLocaleString() + ' USD';
    $('#onchain .src').textContent = 'DefiLlama';

    // 업데이트 시각
    $('#updated').textContent = new Date().toLocaleString();
  } catch (e) {
    console.error(e);
  }
}

window.addEventListener('DOMContentLoaded', async () => {
  // 프록시 살아있는지 가볍게 핑
  await ping();
  await renderAll('BTC');

  // 30초마다 갱신
  setInterval(() => renderAll('BTC'), 30_000);
});
