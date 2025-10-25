// ===============================
// 김치 프리미엄 자동 표시 모듈
// ===============================

async function fetchPremium() {
  try {
    const res = await fetch("https://satoshi-proxy.mujukno1.workers.dev/api/premium");
    const data = await res.json();

    const premium = data.premium_pct.toFixed(2);
    const elem = document.getElementById("kimchi-premium");

    if (elem) {
      elem.textContent = `${premium > 0 ? "▲" : "▼"} ${premium}%`;
      elem.style.color = premium > 0 ? "#ff3b30" : "#00c853";
    } else {
      const box = document.createElement("div");
      box.id = "kimchi-premium";
      box.style.position = "absolute";
      box.style.top = "10px";
      box.style.right = "20px";
      box.style.fontSize = "16px";
      box.style.fontWeight = "bold";
      box.style.zIndex = "9999";
      box.textContent = `${premium > 0 ? "▲" : "▼"} ${premium}%`;
      box.style.color = premium > 0 ? "#ff3b30" : "#00c853";
      document.body.appendChild(box);
    }
  } catch (e) {
    console.error("김프 표시 오류:", e);
  }
}

// 10초마다 자동 업데이트
setInterval(fetchPremium, 10000);
fetchPremium();
