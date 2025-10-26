const API = {
  async json(url){
    const r = await fetch(url, { headers: { "x-app": "zzeol-wallet.pages.dev" }});
    return r.json();
  },
  premium(sym){
    return this.json(`${APP_CONFIG.PROXY_BASE}/api/premium?symbol=${encodeURIComponent(sym)}`);
  },
  onchain(sym){
    return this.json(`${APP_CONFIG.PROXY_BASE}/api/onchain?symbol=${encodeURIComponent(sym)}`);
  },
  health(){
    return this.json(`${APP_CONFIG.PROXY_BASE}/api/health`);
  }
};
