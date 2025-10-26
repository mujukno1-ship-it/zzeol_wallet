// ==== config.js (시작)
window.APP_CFG = {
  // Cloudflare Workers 프록시 주소 (너의 주소로 교체!)
  PROXY_URL: 'https://satoshi-proxy.mujukno1.workers.dev',

  // 기본 심볼
  DEFAULT_SYMBOL: 'BTC',

  // 심볼 -> 업비트마켓/코인가격ID/온체인 체인명 매핑
  MAP: {
    BTC: { upbit: 'KRW-BTC', cg: 'bitcoin', chain: 'Bitcoin'   },
    ETH: { upbit: 'KRW-ETH', cg: 'ethereum', chain: 'Ethereum' },
    SOL: { upbit: 'KRW-SOL', cg: 'solana',   chain: 'Solana'   },
    XRP: { upbit: 'KRW-XRP', cg: 'ripple',   chain: 'XRP'      },
  }
};
// ==== config.js (끝)
