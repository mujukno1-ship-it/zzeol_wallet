import { upbit, json, err, config } from './_utils';

export { config };
export default async function handler() {
  try {
    const data = await upbit('/v1/market/all?isDetails=true');
    // KRW 마켓만 필터
    const krw = data.filter(m => m.market?.startsWith('KRW-'));
    return json({ ok: true, count: krw.length, data: krw });
  } catch (e) {
    return err(e.message || 'markets failed');
  }
}
