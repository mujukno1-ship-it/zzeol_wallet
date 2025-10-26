// public/js/api.js
export const CONFIG = {
  PROXY: 'https://satoshi-proxy.mujukno1.workers.dev', // Cloudflare Worker 프록시
  DEFAULTS: { kimpSymbol: 'BTC', onchainSymbol: 'ETH' },
  REFRESH_MS: 30_000,
};

export const SYMBOL_ALIASES = {
  비트코인: 'BTC',
  이더리움: 'ETH',
  이더: 'ETH',
  btc: 'BTC',
  eth: 'ETH',
};

export function toSymbol(text) {
  if (!text) return null;
  const t = String(text).trim().toUpperCase();
  if (SYMBOL_ALIASES[text.trim()]) return SYMBOL_ALIASES[text.trim()];
  if (/^[A-Z]{2,10}$/.test(t)) return t;
  return null;
}

async function fetchJson(url, opts = {}) {
  const ctl = new AbortController();
  const id = setTimeout(() => ctl.abort(), opts.timeout ?? 12_000);
  try {
    const res = await fetch(url, { ...opts, signal: ctl.signal, headers: { 'Accept':'application/json', ...(opts.headers||{}) } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally { clearTimeout(id); }
}

export async function health() {
  try {
    const j = await fetchJson(`${CONFIG.PROXY}/api/health`);
    return j?.ok ? { ok: true, ts: j.ts } : { ok:false };
  } catch { return { ok:false }; }
}

export async function getPremium(symbol) {
  const sym = toSymbol(symbol) ?? CONFIG.DEFAULTS.kimpSymbol;
  const j = await fetchJson(`${CONFIG.PROXY}/api/premium?symbol=${encodeURIComponent(sym)}`);
  if (!j?.ok) throw new Error('premium api');
  return {
    symbol: sym,
    upbitPrice: j.upbitPrice ?? 0,
    globalUsd: j.globalUsd ?? 0,
    usdkrw: j.usdkrw ?? 0,
    premiumPct: j.premiumPct ?? null,
    updatedAt: j.updatedAt,
  };
}

export async function getOnchain(symbol) {
  const sym = toSymbol(symbol) ?? CONFIG.DEFAULTS.onchainSymbol;
  const j = await fetchJson(`${CONFIG.PROXY}/api/onchain?symbol=${encodeURIComponent(sym)}`);
  if (!j?.ok) throw new Error('onchain api');
  return {
    symbol: sym,
    chain: j.chain ?? 'Ethereum',
    tvl: Number(j.tvl ?? 0),
    updatedAt: j.updatedAt,
  };
}

// formatters
export const fmt = {
  krw: n => (isFinite(n) ? Number(n).toLocaleString('ko-KR') + ' ₩' : '-'),
  usd: n => (isFinite(n) ? '$' + Number(n).toLocaleString('en-US') : '-'),
  pct: n => (isFinite(n) ? `${Number(n).toFixed(2)}%` : '-'),
  compactUSD: n => {
    if (!isFinite(n)) return '-';
    const abs = Math.abs(n);
    if (abs >= 1e12) return '$' + (n/1e12).toFixed(3) + 'T';
    if (abs >= 1e9)  return '$' + (n/1e9 ).toFixed(3) + 'B';
    if (abs >= 1e6)  return '$' + (n/1e6 ).toFixed(3) + 'M';
    if (abs >= 1e3)  return '$' + (n/1e3 ).toFixed(3) + 'K';
    return '$' + n.toFixed(2);
  }
};
