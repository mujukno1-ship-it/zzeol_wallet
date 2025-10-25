// === 업비트·김프·온체인 연동 (Worker 절대경로 버전) ===
const PROXY = "https://satoshi-proxy.mujukno1.workers.dev";  // 쩔다님 워커 주소

// --- 김치 프리미엄 ---
async function loadPremium() {
  try {
    const res = await fetch(`${PROXY}/api/premium`);
    const j = await res.json();
    if (j.ok) {
      document.getElementById("kimchi-premium").innerHTML = `
        <strong>${j.premium_pct.toFixed(2)}%</strong>
        <br>업비트 KRW: ${j.upbit_krw.toLocaleString()}원
        <br>글로벌 KRW: ${j.global_krw.toLocaleString()}원
        <br>USD/KRW: ${j.usdkrw.toLocaleString()}원
      `;
    }
  } catch (e) {
    console.error("premium fail", e);
  }
}

// --- 온체인 데이터 ---
async function loadOnchain(symbol = "ETH") {
  try {
    const res = await fetch(`${PROXY}/api/onchain?symbol=${symbol}`);
    const j = await res.json();
    if (j.ok) {
      document.getElementById("onchain-tvl").innerHTML = `
        <b>${j.chain}</b><br>
        TVL: ${j.tvl_usd ? j.tvl_usd.toLocaleString() + " USD" : "-"}
        <br>활성 주소: ${j.active_addresses_24h ? j.active_addresses_24h.toLocaleString() : "-"}
      `;
    }
  } catch (e) {
    console.error("onchain fail", e);
  }
}

// --- 업비트 KRW 상위 코인 ---
async function loadUpbit() {
  try {
    const markets = await (await fetch(`${PROXY}/api/markets-krw`)).json();
    const list = markets.markets.slice(0, 7).map(m => m.market).join(",");
    const tickers = await (await fetch(`${PROXY}/api/krw-tickers?symbols=${list}`)).json();
    const html = tickers.data.map(x => `
      <tr>
        <td>${x.market}</td>
        <td>${x.trade_price.toLocaleString()}원</td>
        <td style="color:${x.signed_change_rate >= 0 ? '#00ff99' : '#ff6666'};">
          ${(x.signed_change_rate * 100).toFixed(2)}%
        </td>
        <td>${x.acc_trade_price_24h.toLocaleString()}</td>
      </tr>
    `).join("");
    document.getElementById("upbit-table-body").innerHTML = html;
  } catch (e) {
    console.error("upbit fail", e);
  }
}

// --- 페이지 로드시 자동 실행 ---
window.addEventListener("load", () => {
  loadPremium();
  loadOnchain("ETH");
  loadUpbit();
});
