// functions/api/summary.js
export const onRequestGet = async ({ request }) => {
  const { searchParams } = new URL(request.url);
  const market = (searchParams.get("market") || "KRW-ETH").toUpperCase();

  try {
    // 1️⃣ 업비트 현재가 API
    const tickerRes = await fetch(`https://api.upbit.com/v1/ticker?markets=${market}`);
    const tickerData = await tickerRes.json();
    const ticker = tickerData[0];
    const price = ticker.trade_price;
    const change = ticker.signed_change_rate * 100;

    // 2️⃣ 간단한 매수/매도/손절 타점 계산
    const buy = Math.floor(price * 0.994);
    const sell = Math.ceil(price * 1.006);
    const stop = Math.floor(price * 0.978);

    // 3️⃣ 김치 프리미엄 계산 (대략값)
    let kimchi = 0;
    try {
      const usdkrw = (await (await fetch("https://open.er-api.com/v6/latest/USD")).json()).rates.KRW || 1350;
      const symbol = market.replace("KRW-", "");
      const usdRes = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}USDT`);
      const usdData = await usdRes.json();
      const usdPrice = parseFloat(usdData.price);
      kimchi = ((price - usdPrice * usdkrw) / (usdPrice * usdkrw)) * 100;
    } catch (e) {}

    // 4️⃣ 위험도 간단 판정
    let risk = "neutral";
    if (kimchi > 4 || change > 3) risk = "danger";
    else if (kimchi > 2 || Math.abs(change) > 1.5) risk = "caution";

    // 5️⃣ 결과 응답
    return new Response(
      JSON.stringify({
        ok: true,
        symbol: market,
        price,
        change,
        kimchi,
        buy,
        sell,
        stop,
        risk,
      }),
      {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: err.message }),
      { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
    );
  }
};
