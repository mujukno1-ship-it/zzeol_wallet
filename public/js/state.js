window.STATE = {
  symbol: APP_CONFIG.DEFAULT_SYMBOL,
  onchainSymbol: APP_CONFIG.DEFAULT_CHAIN,
  premium: null,   // { upbitPrice, globalUsd, usdkrw, globalKrw, premiumPct, src, updatedAt }
  onchain: null,   // { tvl, src, updatedAt }
  signal: null,    // { now, buy, sell, stop }
  risk: null,      // 1~5
  updatedAt: null,
};

window.util = {
  fmtKRW(n){ if(n==null) return "-"; return Number(n).toLocaleString("ko-KR")+" ₩"; },
  fmtUSD(n){ if(n==null) return "-"; return Number(n).toLocaleString("en-US"); },
  fmtPct(n){ if(n==null) return "-"; return (Number(n).toFixed(2))+"%"; },
  ts(d){ return new Date(d).toLocaleString(); },
};
