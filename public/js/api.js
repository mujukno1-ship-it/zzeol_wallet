// public/js/modules/api.js
import { API_BASE, SYMBOL, CHAIN } from "./config.js";

async function j(url){
  const r = await fetch(url);
  if(!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

export async function fetchPremium(){
  const url = `${API_BASE}/api/premium?symbol=${encodeURIComponent(SYMBOL)}`;
  const d = await j(url);
  if(!d?.ok) throw new Error("premium api error");
  // 정규화
  return {
    upbitPrice: d.upbitPrice ?? null,
    globalUsd : d.globalUsd ?? null,
    usdkrw    : d.usdkrw ?? null,
    premiumPct: d.premiumPct ?? null,
    src       : d.src ?? {},
    updatedAt : d.updatedAt ?? null
  };
}

export async function fetchOnchain(){
  const url = `${API_BASE}/api/onchain?symbol=${encodeURIComponent(CHAIN)}`;
  const d = await j(url);
  if(!d?.ok) throw new Error("onchain api error");
  return {
    tvl: d.tvl ?? null,
    src: d.src ?? "DefiLlama",
    updatedAt: d.updatedAt ?? null
  };
}
