import { upbit, json, err, config } from './_utils';

export { config };
export default async function handler(req) {
  try {
    const { searchParams } = new URL(req.url);
    const market = searchParams.get('market'); // KRW-ETH
    const unit   = Number(searchParams.get('unit') || 5);   // 5분봉 기본
    const count  = Number(searchParams.get('count') || 200);

    if (!market) return err('missing market', 400);

    const path = `/v1/candles/minutes/${unit}?market=${encodeURIComponent(market)}&count=${count}`;
    const data = await upbit(path);
    return json({ ok: true, data });
  } catch (e) {
    return err(e.message || 'candles failed');
  }
}
