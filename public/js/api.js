// public/js/api.js
const API_BASE = 'https://satoshi-proxy.mujukno1.workers.dev/api';

export async function getPremium(symbol) {
  const url = `${API_BASE}/premium?symbol=${encodeURIComponent(symbol)}`;
  const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
  if (!res.ok) throw new Error(`premium ${res.status}`);
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || 'premium error');
  return data; // { ok:true, symbol, upbitPrice, globalUsd, usdrw, premiumPct, ... }
}

export async function getOnchain(symbol) {
  const url = `${API_BASE}/onchain?symbol=${encodeURIComponent(symbol)}`;
  const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
  if (!res.ok) throw new Error(`onchain ${res.status}`);
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || 'onchain error');
  return data; // { ok:true, symbol, chain, tvl, ... }
}

export async function ping() {
  const res = await fetch(`${API_BASE}/health`);
  return res.ok;
}
