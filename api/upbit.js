export default async function handler(req, res) {
  try {
    // ✅ GET 요청만 허용
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // ✅ path 자동 정리 (쿼리 포함 전체 URL에서 추출)
    const fullUrl = req.url || '';
    const match = fullUrl.match(/path=(.+)$/);
    const path = match ? decodeURIComponent(match[1]) : '';

    // ✅ 잘못된 경로 방지
    if (!path.startsWith('/v1/')) {
      return res.status(400).json({ error: 'Invalid path: ' + path });
    }

    // ✅ 업비트 실제 API 호출
    const upstream = 'https://api.upbit.com' + path;
    const response = await fetch(upstream, {
      headers: {
        'User-Agent': 'zzeolwallet/1.0',
        'Accept': 'application/json',
      },
      cache: 'no-store',
    });

    // ✅ 응답 반환
    const text = await response.text();
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'no-store');
    res.status(response.status).send(text);
  } catch (err) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(500).json({ error: 'proxy-fail', message: String(err) });
  }
}
