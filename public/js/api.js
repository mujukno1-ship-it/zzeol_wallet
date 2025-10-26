import { PROXY_BASE } from "./config.js";

async function fetchJson(url, opts = {}) {
  const u = new URL(url);
  u.searchParams.set("_", Date.now());             // 캐시 무력화
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), opts.timeout ?? 12000);

  try {
    const res = await fetch(u.toString(), {
      ...opts,
      signal: ctrl.signal,
      headers: { "Accept": "application/json", ...(opts.headers || {}) }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

export async function apiHealth() {
  return fetchJson(`${PROXY_BASE}/api/health`);
}

export async function apiPremium(symbol) {
  return fetchJson(`${PROXY_BASE}/api/premium?symbol=${encodeURIComponent(symbol)}`);
}

export async function apiOnchain(symbol) {
  return fetchJson(`${PROXY_BASE}/api/onchain?symbol=${encodeURIComponent(symbol)}`);
}
