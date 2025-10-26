window.renderAll = function(){
  // 김프 카드
  const p = STATE.premium;
  document.getElementById("kimp").textContent =
    (p && p.premiumPct!=null) ? util.fmtPct(p.premiumPct) : "-";
  document.getElementById("upbit-krw").textContent = p ? util.fmtKRW(p.upbitPrice) : "-";
  document.getElementById("global-usd").textContent = p ? util.fmtUSD(p.globalUsd) : "-";
  document.getElementById("usd-krw").textContent = p ? util.fmtKRW(p.usdkrw) : "-";
  document.getElementById("src-kimp").textContent =
    p ? `${p?.src?.global ?? "?"} / ${p?.src?.fx ?? "?"} / ${p?.src?.krw ?? "?"}` : "-";

  // 온체인 카드
  const o = STATE.onchain;
  document.getElementById("tvl").textContent = o?.tvl ? util.fmtUSD(o.tvl) : "-";
  document.getElementById("src-onchain").textContent = o?.src ?? "-";

  // 시그널
  const s = STATE.signal;
  document.getElementById("p-now").textContent  = s?.now  ? util.fmtKRW(s.now)  : "-";
  document.getElementById("p-buy").textContent  = s?.buy  ? util.fmtKRW(s.buy)  : "-";
  document.getElementById("p-sell").textContent = s?.sell ? util.fmtKRW(s.sell) : "-";
  document.getElementById("p-stop").textContent = s?.stop ? util.fmtKRW(s.stop) : "-";
  document.getElementById("risk").textContent   = STATE.risk ?? "-";

  // 한마디 & 업데이트
  document.getElementById("talk").textContent = STATE.talk ?? "-";
  document.getElementById("updated").textContent = STATE.updatedAt ? util.ts(STATE.updatedAt) : "-";
};
