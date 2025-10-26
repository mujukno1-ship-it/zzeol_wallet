import cfg from './proxy_config.json' assert { type: 'json' };

// 김치 프리미엄(업비트 KRW / 글로벌USD·환율) 계산 결과를 워커에서 받아옴
export async function getPremium(symbol = 'BTC') {
  const url = `${cfg.proxy_base}${cfg.endpoints.premium}${symbol}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error('프록시 premium 호출 실패');
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || 'premium 데이터 오류');
  return data; // { ok, upbitPrice, globalUsd, usdkrw, globalKrw, premiumPct, ... }
}
