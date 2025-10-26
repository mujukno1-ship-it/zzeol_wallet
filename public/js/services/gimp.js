(function () {
  async function getBinanceUsd(symbol = "BTC") {
    const j = await $api.getJson(
      `https://api.binance.com/api/v3/ticker/price?symbol=${symbol.toUpperCase()}USDT`
    );
    return Number(j.price);
  }
  async function getUsdKrw() {
    const j = await $api.getJson("https://open.er-api.com/v6/latest/USD");
    return Number(j.rates?.KRW);
  }

  // symbol: "BTC" | "ETH" ...
  async function getKimchiPremium(symbol = "BTC") {
    // 병렬 로딩
    const [upbit, usd, fx] = await Promise.all([
      $upbit.getUpbitTickerKRW(symbol),
      getBinanceUsd(symbol),
      getUsdKrw(),
    ]);

    const upbitKrw = Number(upbit.krw ?? 0);
    const globalUsd = Number(usd ?? 0);
    const usdkrw = Number(fx ?? 0);
    const globalKrw = globalUsd * usdkrw || 0;

    let premiumPct = null;
    if (upbitKrw && globalKrw) {
      premiumPct = ((upbitKrw - globalKrw) / globalKrw) * 100;
    }

    return {
      ok: true,
      symbol: symbol.toUpperCase(),
      upbitKrw,
      globalUsd,
      usdkrw,
      globalKrw,
      premiumPct,
      src: { global: "Binance", fx: "open.er-api.com", krw: "Upbit" },
      updatedAt: new Date().toISOString(),
    };
  }

  window.$gimp = { getKimchiPremium };
})();
