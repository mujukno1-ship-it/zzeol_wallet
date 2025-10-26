// public/js/render.js
import { fmt } from './api.js';

export function renderPremium(dom, p) {
  const pctEl = document.getElementById('kimp-pct');
  const upEl  = document.getElementById('upbit-krw');
  const gEl   = document.getElementById('global-usd');
  const uEl   = document.getElementById('usdkrw');
  const symEl = document.getElementById('sym-kimp');

  if (!p) {
    pctEl.textContent = upEl.textContent = gEl.textContent = uEl.textContent = '-';
    return;
  }
  symEl.textContent = p.symbol;
  pctEl.textContent = fmt.pct(p.premiumPct);
  pctEl.className = 'metric ' + (p.premiumPct > 0 ? 'bad' : 'good');
  upEl.textContent = fmt.krw(p.upbitPrice);
  gEl.textContent  = fmt.usd(p.globalUsd);
  uEl.textContent  = p.usdkrw ? p.usdkrw.toLocaleString('ko-KR') : '-';
}

export function renderOnchain(o) {
  document.getElementById('sym-onchain').textContent = o?.symbol ?? 'ETH';
  document.getElementById('onchain-tvl').textContent  = o ? fmt.compactUSD(o.tvl) : '-';
}

export function renderSignal(sig) {
  document.getElementById('sig-price').textContent = sig ? (sig.price?.toLocaleString('ko-KR') + ' ₩') : '-';
  document.getElementById('sig-buy').textContent   = sig ? sig.buy?.toLocaleString('ko-KR') + ' ₩'  : '-';
  document.getElementById('sig-sell').textContent  = sig ? sig.sell?.toLocaleString('ko-KR') + ' ₩' : '-';
  document.getElementById('sig-stop').textContent  = sig ? sig.stop?.toLocaleString('ko-KR') + ' ₩' : '-';
  document.getElementById('sig-risk').textContent  = sig ? `${sig.risk} / 5` : '-';
}

export function renderCommentary(text, ts) {
  document.getElementById('commentary').textContent = text ?? '-';
  document.getElementById('updated').textContent = ts ? new Date(ts).toLocaleString() : '-';
}

export function renderHealth(ok) {
  const el = document.getElementById('proxy-health');
  el.textContent = ok ? '정상' : '오류';
  el.className = ok ? 'good' : 'bad';
}
