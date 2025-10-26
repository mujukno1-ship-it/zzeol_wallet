// 메인 페이지 로직: 연동 모듈 사용
import { getPremium } from '/api_connect/kimchi_premium.js';
import { getOnchain } from '/api_connect/onchain_connect.js';

const $ = (id) => document.getElementById(id);
const set = (id, v) => { const el = $(id); if (el) el.textContent = v; };
const fmt = {
  pct: (x) => (x==null||isNaN(x)) ? '--%' : `${Number(x).toFixed(2)}%`,
  krw: (x) => (x==null||isNaN(x)) ? '-' : Number(x).toLocaleString('ko-KR'),
  num: (x) => (x==null||isNaN(x)) ? '-' : Number(x).toLocaleString('en-US'),
};

async function loadKimchi() {
  try {
    const d = await getPremium('BTC');               // 김프/업비트/환율/글로벌KRW
    set('kimchi-premium', fmt.pct(d.premiumPct));
    set('upbit-krw', fmt.krw(d.upbitPrice));
    set('global-krw', fmt.krw(d.globalKrw));
    set('usd-krw', fmt.num(d.usdkrw));
    set('status', '');
  } catch (e) {
    set('kimchi-premium', '--%');
    set('status', '오류');
    console.error('김프 로드 오류:', e);
  }
}

async function loadOnchain() {
  try {
    const d = await getOnchain('ETH');               // TVL
    set('onchain-tvl', fmt.num(d.tvl));
    set('onchain-active', d.activeAddress ? fmt.num(d.activeAddress) : '-');
  } catch (e) {
    set('onchain-tvl', '-');
    set('onchain-active', '-');
    console.error('온체인 로드 오류:', e);
  }
}

function start() {
  loadKimchi();  loadOnchain();
  setInterval(loadKimchi, 15000);
  setInterval(loadOnchain, 30000);
}
document.addEventListener('DOMContentLoaded', start);
