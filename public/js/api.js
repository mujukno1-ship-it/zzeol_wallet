// public/js/api.js
export const PROXY_BASE = 'https://satoshi-proxy.mujukno1.workers.dev';

export async function fetchPremium(symbol = 'BTC') {
  const url = `${PROXY_BASE}/api/premium?symbol=${encodeURIComponent(symbol)}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`premium http ${r.status}`);
  return r.json();
}

export async function fetchOnchain(symbol = 'ETH') {
  const url = `${PROXY_BASE}/api/onchain?symbol=${encodeURIComponent(symbol)}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`onchain http ${r.status}`);
  return r.json();
}
