// ==============================
// ⚙️ 연동 설정 (여기만 바꾸면 끝)
// ==============================
export const CONFIG = {
  // 기본/백업 API 엔드포인트(자동 Failover)
  API_BASE_URLS: [
    "https://satoshi-proxy.mujukno1.workers.dev",  // 기본
    // "https://<추가-백업-도메인>",               // 필요시 백업 추가
  ],

  // 기본 조회 심볼
  PREMIUM_SYMBOL: "BTC",
  ONCHAIN_SYMBOL: "ETH",

  // 요청 타임아웃(ms)
  TIMEOUT_MS: 7000,

  // 캐시 (API 장애시 화면에 마지막 값 유지)
  CACHE_TTL_MS: 30_000, // 30초

  // 허용 Origin (보안용 – 필요시 사용)
  ALLOW_ORIGINS: [
    // "https://zzeol-wallet.vercel.app",
    // "https://zzeol-wallet.pages.dev",
  ],
};
