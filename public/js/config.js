window.APP_CONFIG = {
  // !!! 본인 Cloudflare Worker 도메인으로 교체 !!!
  PROXY_BASE: "https://satoshi-proxy.mujukno1.workers.dev",

  DEFAULT_SYMBOL: "BTC",
  DEFAULT_CHAIN: "ETH",

  // 검색 자동완성(간단 목록)
  SYMBOLS: [
    { sym: "BTC", name: "비트코인" },
    { sym: "ETH", name: "이더리움" },
    { sym: "XRP", name: "리플" },
    { sym: "SOL", name: "솔라나" },
    { sym: "ADA", name: "에이다" },
    { sym: "DOGE", name: "도지코인" },
  ],
};
