// utils/num.js

// 업비트 가격 틱 규칙 반영(정확한 호가/타점 반올림)
export function roundByUpbitTick(price) {
  const p = Number(price);
  if (p >= 2000000) return Math.round(p / 1000) * 1000;
  if (p >= 1000000) return Math.round(p / 500) * 500;
  if (p >= 500000)  return Math.round(p / 100) * 100;
  if (p >= 100000)  return Math.round(p / 50) * 50;
  if (p >= 10000)   return Math.round(p / 10) * 10;
  if (p >= 1000)    return Math.round(p / 5) * 5;
  if (p >= 100)     return Math.round(p);
  if (p >= 10)      return Math.round(p * 10) / 10;
  if (p >= 1)       return Math.round(p * 100) / 100;
  return Math.round(p * 1000) / 1000; // < 1
}

export function toFixedSmart(n, decimals = 6) {
  if (Number.isNaN(n) || n === null) return "-";
  const x = Number(n);
  if (x === 0) return "0";
  const abs = Math.abs(x);
  if (abs >= 1) return x.toFixed(2);
  if (abs >= 0.1) return x.toFixed(3);
  if (abs >= 0.01) return x.toFixed(4);
  return x.toFixed(Math.min(decimals, 6));
}

// Abort + 재시도 + 타임아웃 래퍼
export async function fetchJSON(url, { timeout = 4000, retries = 1, signal } = {}) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), timeout);
    try {
      const res = await fetch(url, { signal: signal || ac.signal });
      clearTimeout(t);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      clearTimeout(t);
      if (attempt === retries) throw e;
      await new Promise(r => setTimeout(r, 250 * (attempt + 1)));
    }
  }
}

// 등락률 계산(%) – 0 나눗셈 방어
export function changeRate(cur, prev) {
  const c = Number(cur), p = Number(prev);
  if (!p) return 0;
  return ((c - p) / p) * 100;
}
