import { upbit, json, err, config } from './_utils';

export { config };
export default async function handler(req) {
  try {
    const { searchParams } = new URL(req.url);
    const markets = searchParams.get('markets'); // 예: KRW-ETH,KRW-BTC
    if (!markets) return err('missing markets', 400);

    const data = await upbit(`/v1/ticker?markets=${encodeURIComponent(markets)}`);
    return json({ ok: true, data });
  } catch (e) {
    return err(e.message || 'ticker failed');
  }
}
