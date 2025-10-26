// ✅ zzeol_wallet 통합 API (업비트 + CoinGecko + 온체인 + 김프) 완성판
const API_BASE = "https://satoshi-proxy.mujukno1.workers.dev";

async function fetchPrice(symbol) {
  try {
    const res = await fetch(`${API_BASE}/api/premium?symbol=${symbol}`);
    const data = await res.json();
    if (!data || data.error) throw new Error(data?.error || "데이터 없음");
    return data;
  } catch (err) {
    console.error(`[fetchPrice] ${symbol} 실패:`, err.message);
    return { ok: false, error: err.message };
  }
}

// 업비트 실시간 시세 + 김치 프리미엄 계산
async function getKimp(symbol = "BTC") {
  try {
    const upbitRes = await fetch(`${API_BASE}/api/upbit?symbol=${symbol}`); 
    const upbitData = await upbitRes.json();
    const krwPrice = upbitData[0]?.trade_price || 0;

    const cgData = await fetchPrice(symbol);
    const usdPrice = cgData?.usd || 0;

    const exchangeRate = krwPrice / usdPrice;
    const kimp = ((exchangeRate / 1400 - 1) * 100).toFixed(2);

    return {
      symbol,
      krwPrice,
      usdPrice,
      kimp,
      exchangeRate,
      time: new Date().toLocaleTimeString("ko-KR"),
    };
  } catch (err) {
    console.error("[getKimp] 실패:", err.message);
    return { error: err.message };
  }
}

// 온체인 데이터 (추후 확장 가능)
async function getOnchain(symbol = "BTC") {
  try {
    const res = await fetch(`${API_BASE}/api/onchain?symbol=${symbol}`);
    const data = await res.json();
    return data;
  } catch (err) {
    return { ok: false, error: "온체인 불러오기 실패" };
  }
}

// 테스트 실행
(async () => {
  const btc = await getKimp("BTC");
  console.log("✅ BTC 종합 데이터:", btc);
})();
