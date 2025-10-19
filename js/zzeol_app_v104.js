// ===== 최소 동작 v104 =====
// API 규칙: /api/ticker?ms=KRW-SHIB , /api/markets?isDetails=true
document.addEventListener("DOMContentLoaded", () => {
  const mark = document.querySelector("div[style*='HTML v104 loaded']");
  if (mark) mark.textContent += " + JS v104 loaded";

  const code = "KRW-SHIB";
  const elPrice = document.getElementById("price");
  const listBody = document.getElementById("coin-list-body");

  // 티커 2초 루프
  const fetchTicker = async () => {
    try {
      const r = await fetch(`/api/ticker?ms=${encodeURIComponent(code)}`, { cache: "no-store" });
      const js = await r.json();
      const t = Array.isArray(js) ? js[0] : js?.result?.[0] || js;
      if (t && elPrice) elPrice.textContent = Number(t.trade_price).toLocaleString("ko-KR");
    } catch {}
  };
  fetchTicker();
  setInterval(fetchTicker, 2000);

  // KRW 목록 1회 로드
  (async () => {
    try {
      const r = await fetch(`/api/markets?isDetails=true`, { cache: "no-store" });
      const arr = await r.json();
      const rows = (arr || []).filter(x => (x.market || "").startsWith("KRW-"));
      listBody.innerHTML = "";
      const frag = document.createDocumentFragment();
      rows.forEach(x => {
        const tr = document.createElement("tr");
        tr.dataset.code = x.market;
        tr.style.cursor = "pointer";
        tr.onclick = () => {
          document.getElementById("coin-code").textContent = x.market;
        };
        const td = (t) => { const e = document.createElement("td"); e.textContent = t; return e; };
        tr.append(td(x.market.replace(/^KRW-/, "")));
        tr.append(td(x.korean_name || x.english_name || "-"));
        tr.append(td("-")); tr.append(td("-")); tr.append(td("-"));
        frag.appendChild(tr);
      });
      listBody.appendChild(frag);
    } catch {}
  })();
});
