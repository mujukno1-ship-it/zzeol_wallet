// api/onchain.js
export default async function handler(req, res) {
  try {
    const symbol = (req.query.symbol || '').toString().toUpperCase();
    if (!symbol) {
      return res.status(400).json({ error: 'symbol is required' });
    }

    // ─────────────────────────────────────────
    // ① 네가 기존에 쓰던 온체인/가격/MA 로딩 로직을 그대로 둔다.
    //    아래는 예시. 실제로는 네 기존 코드(Upbit, Glassnode, CoinGecko 등)를 사용.
    const price = await getPrice(symbol);   // number | null
    const ma200 = await getMA200(symbol);   // number | null
    const rawSignal = await getRawSignal(symbol); // 'buy' | 'sell' | 'long' | 'short' | '매수' | '매도' | null
    const levels = await getLevels(symbol); // { stop:number, take:number } | null
    // ─────────────────────────────────────────

    const result = {
      symbol,
      price: toNum(price),
      ma200: toNum(ma200),
      signal: normalizeSignal(rawSignal),
      levels: normalizeLevels(levels),
    };

    // ② 보강: 값이 없거나 비어있다면 기본 생성
    // signal 보강: price/Ma200 비교
    if (!result.signal && isNum(result.price) && isNum(result.ma200)) {
      result.signal = result.price > result.ma200 ? '매수' : '매도';
    }

    // levels 보강: ±3%
    if ((!result.levels || !isNum(result.levels.stop) || !isNum(result.levels.take)) && isNum(result.price)) {
      const p = result.price;
      result.levels = {
        stop: round(p * 0.97),
        take: round(p * 1.03),
      };
    }

    // 안전 가드: 값 없으면 null → '-'는 프론트에서 표시
    if (!isNum(result.price)) result.price = null;
    if (!isNum(result.ma200)) result.ma200 = null;

    return res.status(200).json(result);
  } catch (e) {
    console.error('[onchain]', e);
    return res.status(500).json({ error: 'internal_error' });
  }
}

/** ───────── 유틸 ───────── */
function normalizeSignal(sig) {
  if (!sig) return null;
  const s = String(sig).trim().toLowerCase();
  if (/buy|long|매수/.test(s)) return '매수';
  if (/sell|short|매도/.test(s)) return '매도';
  return null;
}
function normalizeLevels(lv) {
  if (!lv || typeof lv !== 'object') return null;
  const stop = toNum(lv.stop);
  const take = toNum(lv.take);
  if (!isNum(stop) || !isNum(take)) return null;
  return { stop: round(stop), take: round(take) };
}
function toNum(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}
function isNum(x) {
  return typeof x === 'number' && Number.isFinite(x);
}
function round(n, d = 2) {
  const pow = Math.pow(10, d);
  return Math.round(n * pow) / pow;
}

/** ──────── 예시 데이터 소스(네 기존 코드로 대체) ──────── */
// 아래 3개는 임시 더미. 반드시 네 기존 데이터 로직으로 대체/연결해.
async function getPrice(symbol) {
  // Upbit/Coingecko 등에서 현재가 로드
  return null; // 예시: 일부 코인에서 null일 수 있음 → 보강 로직이 커버
}
async function getMA200(symbol) {
  // MA200 계산 or API
  return null;
}
async function getRawSignal(symbol) {
  // 기존 전략 신호
  return null; // buy/sell/long/short/매수/매도 등
}
async function getLevels(symbol) {
  // 기존 손절/익절 계산
  return null; // { stop, take }
}
