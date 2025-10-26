// 필요 시 직접 업비트 API를 때려서 시세만 확인할 수 있게 분리
export async function getUpbitPriceKRW(symbol = 'BTC') {
  const url = `https://api.upbit.com/v1/ticker?markets=KRW-${symbol}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('업비트 시세 연결 실패');
  const data = await res.json();
  return data?.[0]?.trade_price ?? null;
}
