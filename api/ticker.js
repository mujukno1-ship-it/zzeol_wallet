import { ok, fail, handleOptions } from './_utils';

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  try {
    const ms = String(req.query.ms || '').trim();
    if (!ms) return fail(res, 400, 'param "ms" required');
    const url = 'https://api.upbit.com/v1/ticker?markets=' + encodeURIComponent(ms);
    const r = await fetch(url, { headers: { 'Accept':'application/json' }, cache:'no-store' });
    if (!r.ok) throw new Error('upbit ticker ' + r.status);
    const data = await r.json();
    ok(res, data);
  } catch (e) { fail(res, 500, e.message); }
}
