async function loadPremium() {
  const symbol = "BTC";
  const url = `https://satoshi-proxy.mujukno1.workers.dev/api/premium?symbol=${symbol}`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    if (!data.ok) throw new Error("API 오류");

    document.querySelector("#kimchi").innerHTML = `
      <b>${data.premiumPct.toFixed(2)}%</b>
      <br>업비트 KRW: ${data.upbitPrice.toLocaleString()}원
      <br>글로벌 KRW: ${data.globalKrw.toLocaleString()}원
    `;
  } catch (err) {
    document.querySelector("#kimchi").innerText = "오류: " + err.message;
  }
}

async function loadOnchain() {
  const url = "https://satoshi-proxy.mujukno1.workers.dev/api/onchain?symbol=ETH";
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (!data.ok) throw new Error("온체인 오류");

    document.querySelector("#onchain").innerHTML = `
      TVL: ${Number(data.tvl).toLocaleString()}<br>
      활성 주소: ${data.activeAddress?.toLocaleString() ?? "-"}
    `;
  } catch (err) {
    document.querySelector("#onchain").innerText = "오류: " + err.message;
  }
}

window.addEventListener("load", () => {
  console.log("✅ 사토시의지갑 main.js (정상 연결)");
  loadPremium();
  loadOnchain();
  setInterval(loadPremium, 20000);
  setInterval(loadOnchain, 20000);
});
