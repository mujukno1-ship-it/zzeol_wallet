// public/js/modules/config.js
export const API_BASE = "https://satoshi-proxy.mujukno1.workers.dev";
export const SYMBOL = "BTC";   // 업비트 코인 심볼
export const CHAIN  = "ETH";   // 온체인 TVL용
export const REFRESH_MS = 10_000; // 10초마다 갱신

// 손절/목표 기본 파라미터(필요시 조정)
export const DEFAULT_STOP_PCT = 0.02; // 2% 손절
export const BASE_TAKE_PCT    = 0.012; // 1.2% 기본 익절
