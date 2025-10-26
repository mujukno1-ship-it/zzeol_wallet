(async function () {
  const $ = (s) => document.querySelector(s);

  const el = {
    premium: $("#kimchi-premium"),
    upbitKrw: $("#upbit-krw"),
    globalUsd: $("#global-usd"),
    usdKrw: $("#usd-krw"),
    tvl: $("#onchain-tvl"),
    price: $("#sig-price"),
    buy: $("#sig-buy"),
    sell: $("#sig-sell"),
    stop: $("#sig-stop"),
    risk: $("#sig-risk"),
    comm: $("#commentary"),
    updated: $("#updated"),
    q: $("#search-input"),
    clear: $("#search-clear"),
  };

  // 숫자 포맷 도우미
  const nf0 = new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 0 });
  const nf2 = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

  function fmtKRW(v){ return v==null? "-" : nf0.format(Math.round(v)) + " ₩"; }
  function fmtUSD(v){ return v==null? "-" : "$ " + nf2.format(v); }
  function pct(v){ return v==null? "-" : (v>=0? "+" : "") + v.toFixed(2) + "%"; }

  // 간단 시그널: 현재가 기준으로 매수/매도/손절 라인 & 위험도 추정
  function buildSignals(upbitKrw, premiumPct) {
    if (!upbitKrw) return { price:"-", buy:"-", sell:"-", stop:"-", risk:"-" };

    const price = upbitKrw;
    const buy = price * 0.998;  // -0.2%
    const sell = price * 1.012; // +1.2%
    const stop = price * 0.985; // -1.5%

    // 김프가 +3% 이상이면 과열(위험↑), -2% 이하면 저평가(위험↓)로 단순 표기
    let riskTxt = "보통";
    let cls = "";
    if (premiumPct != null) {
      if (premiumPct >= 3) { riskTxt = "위험 ↑"; cls = "risk"; }
      else if (premiumPct <= -2) { riskTxt = "안정 ↓"; cls = "ok"; }
      else { riskTxt = "보통"; cls = ""; }
    }
    return {
      price: fmtKRW(price),
      buy: fmtKRW(buy),
      sell: fmtKRW(sell),
      stop: fmtKRW(stop),
      risk: { text: riskTxt, cls },
    };
  }

  function setRiskPill(pill, risk) {
    pill.textContent = risk.text;
    pill.classList.remove("ok","risk","warn");
    if (risk.cls) pill.classList.add(risk.cls);
  }

  function setComment(pct) {
    if (pct == null) { el.comm.textContent = "-"; return; }
    if (pct > 4) el.comm.textContent = "시장 과열 주의. 손절 라인 먼저! 🛡️";
    else if (pct > 2) el.comm.textContent = "상승 추세. 무리한 추격은 금지!";
    else if (pct < -2) el.comm.textContent = "역프 구간. 분할매수 관망 🧊";
    else el.comm.textContent = "시장 눈치 보기. 손절 라인 먼저! 🛡️";
  }

  async function refresh(symbol) {
    const sym = (symbol || "").trim().toUpperCase() || (window.DEFAULT_SYMBOL || "BTC");

    // 1) 김프
    const g = await $gimp.getKimchiPremium(sym);
    const premiumPct = g.premiumPct;

    el.premium.textContent = premiumPct==null? "-" : pct(premiumPct);
    el.upbitKrw.textContent = fmtKRW(g.upbitKrw);
    el.globalUsd.textContent = fmtUSD(g.globalUsd);
    el.usdKrw.textContent = g.usdkrw ? nf2.format(g.usdkrw) : "-";

    // 2) 온체인
    const oc = await $onchain.getOnchainTvl("ETH");
    el.tvl.textContent = oc.tvl ? "$ " + nf0.format(Math.round(oc.tvl)) : "-";

    // 3) 시그널/코멘트
    const sig = buildSignals(g.upbitKrw, premiumPct);
    el.price.textContent = sig.price;
    el.buy.textContent   = sig.buy;
    el.sell.textContent  = sig.sell;
    el.stop.textContent  = sig.stop;
    setRiskPill(el.risk, sig.risk);
    setComment(premiumPct);

    // 업데이트 타임
    el.updated.textContent = new Date().toLocaleString("ko-KR");
  }

  // 검색 동작 (한글/영문 심볼 자동 인식 간단 매핑)
  function normalizeQuery(q) {
    q = (q||"").trim();
    if (!q) return "";
    const KMAP = { "비트","비트코인":"BTC", "이더","이더리움":"ETH", "솔","솔라나":"SOL" };
    for (const k in KMAP) if (q.includes(k)) return KMAP[k];
    return q.toUpperCase();
  }

  el.q.addEventListener("keydown", (e)=>{
    if (e.key === "Enter") refresh(normalizeQuery(el.q.value));
  });
  el.clear.addEventListener("click", ()=>{
    el.q.value = "";
    refresh("");
  });

  // 첫 로딩 + 주기 갱신(30초)
  await refresh("");
  setInterval(()=>refresh(el.q.value), 30_000);
})();
