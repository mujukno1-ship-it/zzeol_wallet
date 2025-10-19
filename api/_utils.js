export const config = { runtime: 'edge' };

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, OPTIONS',
  'access-control-allow-headers': 'content-type, user-agent',
};

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...CORS,
    },
  });
}

export function err(message = 'Internal Server Error', status = 500) {
  return json({ ok: false, error: message }, status);
}

export async function upbit(url) {
  // Upbit 퍼블릭 API 호출 공통 래퍼
  const res = await fetch(`https://api.upbit.com${url}`, {
    method: 'GET',
    cache: 'no-store',               // 캐시 무효화
    headers: { 'user-agent': 'zzeol-wallet/1.0' },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Upbit ${res.status}: ${text}`);
  }
  return res.json();
}
