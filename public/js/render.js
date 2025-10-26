function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function setHTML(id, html) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
}

export function renderPremium(p) {
  // 주요 수치
  if (!p) return;
  const pct = (p.premiumPct ?? 0);
  const pctStr = isFinite(pct) ? `${pct.toFixed(2)}%` : "-";

  // 카드 상단 퍼센트
  setText("kimp", pctStr);

  // 세부항목(있으면 채움)
  setText("kimp-krw", p.upbitPrice ? p.upbitPrice.toLocaleString("ko-KR") + " ₩" : "-");
  setText("usdkrw",  p.usdkrw ? p.usdkrw.toLocaleString("ko-KR") : "-");

  // 소스 표기
  const srcGlobal = p.src?.global ?? "CoinGecko";
  const srcFx     = p.src?.fx ?? "open.er-api.com";
  const srcKrw    = p.src?.krw ?? "Upbit";

  setText("src-global", srcGlobal);
  setText("src-fx",     srcFx);
  setText("src-krw",    srcKrw);
}

export function renderOnchain(o) {
  if (!o) return;
  const tvl = o.tvl ?? null;
  setText("onchain-tvl", tvl ? tvl.toLocaleString("en-US") + " USD" : "-");
  setText("src-onchain", o.src ?? "DefiLlama");
}

export function renderCommentary(msg, isoTime) {
  setText("commentary", msg || "-");
  const updated = document.getElementById("updated");
  if (updated) {
    const d = isoTime ? new Date(isoTime) : new Date();
    updated.textContent = d.toLocaleString("ko-KR");
  }
}

export function renderTopError(msg) {
  const box = document.getElementById("search-results");
  if (box) box.innerHTML = `<span class="bad">⚠ ${msg}</span>`;
}
