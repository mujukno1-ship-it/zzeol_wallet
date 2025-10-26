import cfg from '/api_connect/proxy_config.json' assert { type: 'json' };

async function ping() {
  const base = cfg.proxy_base;
  const urls = [
    base + cfg.endpoints.health,
    base + cfg.endpoints.premium + 'BTC',
    base + cfg.endpoints.onchain + 'ETH',
  ];
  for (const u of urls) {
    try {
      const r = await fetch(u, { cache: 'no-store' });
      console.log(u, r.status, await r.text());
    } catch (e) {
      console.error(u, 'ERR', e);
    }
  }
}
ping();
