import { ok, fail, handleOptions } from './_utils';

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  try {
    const m = String(req.query.m || '').trim();
    const count = Number(req.query.count || 60);
    if (!m) return fail(res, 400, 'param "m" required');
    const url = `https://api.upbit.com/v1/trades/ticks?market=${encodeURIComponent(m)}&count=${count}`;
    const r = await fetch(url, { headers: { 'Accept':'application/json' }, cache:'no-store' });
    if (!r.ok) throw new Error('upbit ticks ' + r.status);
    const data = await r.json();
    ok(res, data);
  } catch (e) { fail(res, 500, e.message); }
}
