// ==========================
// 💰 김치 프리미엄 자동 표시
// ==========================
async function updatePremiumBox() {
  const premiumBox = document.querySelector(".premium-box");
  if (!premiumBox) return;

  try {
    const res = await fetch("https://satoshi-proxy.mujukno1.workers.dev/api/premium", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const premium = data.premium_pct?.toFixed(2) ?? "--";
    const upbit = data.upbit_krw?.toLocaleString() ?? "-";
    const binance = data.binance_usd?.toLocaleString() ?? "-";
    const usdkrw = data.usdkrw?.toFixed(2) ?? "-";
    const global = data.global_krw?.toLocaleString() ?? "-";

    // 색상 적용
    const color = premium > 0 ? "#ff3b30" : premium < 0 ? "#00c853" : "#888";
    premiumBox.innerHTML = `
      <b style="color:${color}; font-size:20px;">
        ${premium > 0 ? "▲" : premium < 0 ? "▼" : ""}${premium}%
      </b>
      <div style="font-size:12px; margin-top:6px; color:#ccc;">
        업비트 KRW: ${upbit}<br>
        글로벌 KRW: ${global}<br>
        Binance: ${binance}<br>
        USD/KRW: ${usdkrw}
      </div>
    `;
  } catch (e) {
    console.error("김프 API 오류:", e);
    premiumBox.innerHTML = `<b style="color:#888;">--% 오류</b>`;
  }
}

// 10초마다 자동 갱신
setInterval(updatePremiumBox, 10000);
updatePremiumBox();
