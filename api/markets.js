import { ok, fail, handleOptions } from './_utils';

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  try {
    const r = await fetch('https://api.upbit.com/v1/market/all?isDetails=true', {
      headers: { 'Accept': 'application/json' },
      cache: 'no-store',
    });
    if (!r.ok) throw new Error('upbit markets ' + r.status);
    const data = await r.json();
    // 그대로 반환 (프론트에서 KRW-*만 쓰므로 필터링 안 함)
    ok(res, data);
  } catch (e) { fail(res, 500, e.message); }
}

