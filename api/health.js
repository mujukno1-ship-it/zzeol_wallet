import { json, config } from './_utils';

export { config };
export default async function handler() {
  return json({ ok: true, ts: Date.now() });
}
