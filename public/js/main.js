// ====== ULTRA 시그널 표시 (기존기능 유지 + 새로운 칩 추가) ======
async function openUltra(market) {
  try {
    const res = await fetch(`${API_BASE}/ultra/signal?market=${market}`);
    const s = await res.json();
    if (!s.ok) throw new Error(s.error || "API Error");

    // === 기존 필드 표시 ===
    $("#ultra-market").text(`${s.market}`);
    $("#price").text(fmt(s.price));
    $("#buy1").text(fmt(s.buy1));
    $("#buy2").text(fmt(s.buy2));
    $("#tp1").text(fmt(s.tp1));
    $("#tp2").text(fmt(s.tp2));
    $("#sl").text(fmt(s.sl));
    $("#t_high1").text(fmt(s.target_high1));
    $("#t_high2").text(fmt(s.target_high2));
    $("#t_low1").text(fmt(s.target_low1));
    $("#retr_to").text(fmt(s.retracement_to));
    $("#pds1").text(fmt(s.post_dip_sell1));
    $("#pds2").text(fmt(s.post_dip_sell2));

    // === 추가 칩 (새로운 기능) ===
    const extraChips = `
      <div class="chip-set">
        <span class="chip chip-rvol">RVOL(5분): <b>${Number(s.rvol5 ?? s.rvol).toFixed(2)}</b></span>
        <span class="chip chip-heat">세력강도(Heat): <b>${s.heat ?? "-"}%</b></span>
        <span class="chip chip-mode">시장모드: 
          ${s.mode === "불장" ? "🔥 불장" : s.mode === "하락장" ? "🧊 하락장" : "⚖ 조정"}
        </span>
      </div>
    `;
    $("#ultra-extra").html(extraChips);

    // === 쩔어한마디 자동 생성 ===
    let msg = "";
    if (s.mode === "불장") msg = "🔥 세력 예열 중 — 눌림매수 유효, 조기익절 금지.";
    else if (s.mode === "하락장") msg = "🧊 세력 이탈 감지 — 빠른 청산 또는 관망 권장.";
    else msg = "⚖ 조정 구간 — 단기 스캘핑 외 진입 자제.";
    $("#ultra-ment").text(msg);

  } catch (err) {
    console.error("ULTRA Error:", err);
    $("#ultra-ment").text("데이터 불러오는 중 오류 발생");
  }
}

// ====== 숫자 포맷 ======
function fmt(x) {
  return Number(x ?? 0).toLocaleString("ko-KR", { maximumFractionDigits: 3 });
}
