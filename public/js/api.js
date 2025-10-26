import { CONFIG } from "./config.js";

// 내부 유틸: 타임아웃 fetch
function fetchWithTimeout(url, opt = {}, timeout = CONFIG.TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const ctrl = new AbortController();
    const id = setTimeout(() => ctrl.abort(), timeout);
    fetch(url, { ...opt, signal: ctrl.signal })
      .then(res => { clearTimeout(id); resolve(res); })
      .catch(err => { clearTimeout(id); reject(err); });
  });
}

// API 헬스체크
export async function healthCheck() {
  for (const base of CONFIG.API_BASE_URLS) {
    try {
      const r = await fetchWithTimeout(`${base}/api/health`);
      const j = await r.json();
      if (j?.ok) return base; // 첫 번째 정상 base 반환
    } catch (_) {}
  }
  throw new Error("All API endpoints down");
}

// 공통 요청 (자동 Failover + 캐시)
export async function apiGet(path, { cacheKey } = {}) {
  // 1) 캐시 먼저
  if (cacheKey) {
    const raw = localStorage.getItem(cacheKey);
    if (raw) {
      try {
        const { t, v } = JSON.parse(raw);
        if (Date.now() - t < CONFIG.CACHE_TTL_MS) {
          return v; // 신선 캐시 반환
        }
      } catch (_) {}
    }
  }

  // 2) 헬스체크로 살아있는 base 고르기
  const base = await healthCheck();

  // 3) 실제 요청
  const url = `${base}${path}`;
  const res = await fetchWithTimeout(url);
  const data = await res.json();

  // 4) 캐시 저장
  if (cacheKey) {
    localStorage.setItem(cacheKey, JSON.stringify({ t: Date.now(), v: data }));
  }

  return data;
}
