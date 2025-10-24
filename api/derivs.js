// /api/derivs.js
// BTC 기준: OI, 펀딩, 마크가격
export default async function handler(req, res) {
  try {
    const base = (req.query.symbol || 'BTC').toString().toUpperCase();
    const symbol = `${base}USDT`;

    const [oiR, premR] = await Promise.all([
      fetch(`https://fapi.binance.com/fapi/v1/openInterest?symbol=${symbol}`),
      fetch(`https://fapi.binance.com/fapi/v1/premiumIndex?symbol=${symbol}`)
    ]);

    const oiJson = oiR.ok ? await oiR.json() : null;
    const prem   = premR.ok ? await premR.json() : null;

    const openInterest = oiJson ? Number(oiJson.openInterest) : null;
    const fundingRate  = prem ? Number(prem.lastFundingRate) : null;
    const markPrice    = prem ? Number(prem.markPrice) : null;

    return res.status(200).json({ symbol, openInterest, fundingRate, markPrice, ts: Date.now() });
  } catch (e) {
    return res.status(500).json({ error: 'derivs_internal', message: String(e) });
  }
}
