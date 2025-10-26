(function () {
  // Upbit REST (CORS 허용됨). 문제시 PROXY로 폴백.
  async function getUpbitTickerKRW(symbol = "BTC") {
    const market = `KRW-${symbol.toUpperCase()}`;
    const direct = (async () => {
      const j = await $api.getJson(
        `https://api.upbit.com/v1/ticker?markets=${market}`
      );
      // j[0].trade_price (KRW)
      return { krw: j[0]?.trade_price ?? null, raw: j[0] ?? null };
    })();

    try {
      return await direct;
    } catch {
      // 프록시 폴백 (/api/premium?symbol=BTC 에 upbitPrice 포함)
      const p = await $api.getViaProxy(`/api/premium?symbol=${symbol}`);
      return { krw: p.upbitPrice ?? null, raw: p };
    }
  }

  window.$upbit = { getUpbitTickerKRW };
})();
