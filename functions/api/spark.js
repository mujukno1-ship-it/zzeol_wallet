// functions/api/spark.js
// Cloudflare Pages Functions (Edge)
// KRW 마켓 대상: 최근 3분 급등 + 거래량 급증 "스파크" 탐지

const UPBIT = 'https://api.upbit.com/v1';

const HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
};

const ok = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: HEADERS });

const err = (message, status = 500) =>
  ok({ ok: false, error: message }, status);

// 간단한 sleep (레이트리밋 완화용)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 동시성 제한 실행기
async function runBatched(items, batchSize, worker) {
  const out = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const chunk = items.slice(i, i + batchSize);
    const res = await Promise.allSettled(chunk.map(worker));
    for (const r of res) if (r.status === 'fulfilled' && r.value) out.push(r.value);
    // 업비트 레이트리밋 고려 약간 쉼
    await sleep(120);
  }
  return out;
}

async function fetchJSON(url) {
  const res = await fetch(url, { cf: { cacheTtl: 0, cacheEverything: false } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

/**
 * 스파크 판단:
 * 최근 3분 상승률(마지막 캔들 close vs 3분 전 close) >= minRise
 * AND 최근 3분 거래량 합 / 최근 10분 평균 거래량 >= minVolRatio
 */
function detectSpark(candles, minRise = 2.0, minVolRatio = 3.0) {
  if (!Array.isArray(candles) || candles.length < 10) return null;

  // Upbit 1분 캔들: 최신이 0번 인덱스 (내림차순)
  const pNow = candles[0].trade_price;
  const p3m  = candles[3].trade_price;
  const rise = ((pNow - p3m) / p3m) * 100;

  const vol3 = candles.slice(0, 3).reduce((a, c) => a + (c.candle_acc_trade_volume || 0), 0);
  const vol10avg =
    candles.slice(0, 10).reduce((a, c) => a + (c.candle_acc_trade_volume || 0), 0) / 10;

  const volRatio = vol10avg > 0 ? vol3 / vol10avg : 0;

  if (rise >= minRise && volRatio >= minVolRatio) {
    return { rise, volRatio, price: pNow };
  }
  return null;
}

export async function onRequest({ request }) {
  try {
    const url = new URL(request.url);
    const minRise = Number(url.searchParams.get('minRise') || 2.0);      // %
    const minVol  = Number(url.searchParams.get('minVolRatio') || 3.0);  // 배수
    const limit   = Number(url.searchParams.get('limit') || 60);         // 검사할 KRW 마켓 수 (상위 거래량 기준)

    // 1) KRW 마켓 모으기
    const all = await fetchJSON(`${UPBIT}/market/all?isDetails=false`);
    const krw = all.filter((m) => m.market && m.market.startsWith('KRW-'));

    // 2) 거래량 상위 우선 검사: ticker로 24h 금액 추출 → 상위 limit개 선정
    //    (한 번에 100개까지 가능)
    const batchMarkets = [];
    for (let i = 0; i < krw.length; i += 100) {
      const part = krw.slice(i, i + 100).map((m) => m.market).join(',');
      const tick = await fetchJSON(`${UPBIT}/ticker?markets=${encodeURIComponent(part)}`);
      batchMarkets.push(...tick);
      await sleep(100);
    }
    batchMarkets.sort((a, b) => (b.acc_trade_price_24h || 0) - (a.acc_trade_price_24h || 0));
    const targets = batchMarkets.slice(0, Math.min(limit, batchMarkets.length));

    // 3) 각 종목 1분 캔들 10개로 스파크 판단 (동시 8개씩)
    const sparks = await runBatched(
      targets,
      8,
      async (t) => {
        try {
          const c = await fetchJSON(
            `${UPBIT}/candles/minutes/1?market=${t.market}&count=10`
          );
          const sp = detectSpark(c, minRise, minVol);
          if (!sp) return null;
          return {
            market: t.market,
            symbol: t.market.replace('KRW-', ''),
            price: Math.round(sp.price),
            rise3m: Number(sp.rise.toFixed(2)),
            volRatio: Number(sp.volRatio.toFixed(2)),
            ts: c[0]?.timestamp || Date.now(),
          };
        } catch {
          return null;
        }
      }
    );

    // 4) 정렬 & 응답
    sparks.sort((a, b) => (b.rise3m - a.rise3m) || (b.volRatio - a.volRatio));

    return ok({
      ok: true,
      count: sparks.length,
      minRise, minVolRatio: minVol,
      items: sparks,
      ts: Date.now(),
    });
  } catch (e) {
    return err(e.message || 'spark failed');
  }
}
