import cfg from './proxy_config.json' assert { type: 'json' };

// 온체인 TVL (DefiLlama)
export async function getOnchain(symbol = 'ETH') {
  const url = `${cfg.proxy_base}${cfg.endpoints.onchain}${symbol}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error('프록시 onchain 호출 실패');
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || 'onchain 데이터 오류');
  return data; // { ok, tvl, chain, ... }
}
