// public/js/main.js
import { REFRESH_MS } from "./config.js";
import { fetchPremium, fetchOnchain } from "./api.js";
import { state, pushHistory } from "./state.js";
import { calcSignals } from "./indicators.js";
import { computeRisk } from "./risk.js";
import { makeComment } from "./commentary.js";
import { renderPremium, renderOnchain, renderSignals } from "./render.js";

async function tick(){
  try{
    const [p, o] = await Promise.all([fetchPremium(), fetchOnchain()]);

    // 화면1: 프리미엄 & 시세
    const kimpPct = p.premiumPct ?? deriveKimp(p);
    renderPremium({
      kimpPct, upbitPrice: p.upbitPrice, usdkrw: p.usdkrw, globalUsd: p.globalUsd,
      src: p.src, updatedAt: p.updatedAt
    });
    renderOnchain({ tvl: o.tvl, src: o.src });

    // 상태 기록
    pushHistory(state.history.premiumPct, Number(kimpPct), state.maxPoints);
    pushHistory(state.history.price, Number(p.upbitPrice), state.maxPoints);

    // 시그널 계산
    const sig = calcSignals({
      nowPrice: p.upbitPrice,
      premiumPctHist: state.history.premiumPct,
      tvlUsd: o.tvl,
    });
    const risk = computeRisk({ premiumPctHist: state.history.premiumPct, tvlUsd: o.tvl });
    const comment = makeComment({ bias: sig.bias, risk, kimpAvg: sig.kimpAvg, kimpSlope: sig.kimpSlope });

    renderSignals({
      nowPrice: p.upbitPrice,
      buyPrice: sig.buyPrice,
      sellPrice: sig.sellPrice,
      stopPrice: sig.stopPrice,
      risk,
      comment
    });

  }catch(e){
    console.error(e);
    // 최소 표시
    renderSignals({ nowPrice: null, buyPrice:null, sellPrice:null, stopPrice:null, risk:"-", comment:"데이터 로딩 오류" });
  }
}

function deriveKimp(p){
  // premiumPct가 null일 때 대비: (업비트KRW / (글로벌USD * USDKRW) - 1) * 100
  const { upbitPrice, globalUsd, usdkrw } = p;
  if(!upbitPrice || !globalUsd || !usdkrw) return null;
  const globalKrw = Number(globalUsd) * Number(usdkrw);
  return ((Number(upbitPrice)/globalKrw) - 1) * 100;
}

tick();
setInterval(tick, REFRESH_MS);
// === 검색 기능 연결 ===
if (window.Search) {
  window.Search.init({
    maxResults: 12,
    onPick: (item) => {
      console.log("선택된 코인:", item.symbol);
      // 필요 시 여기에: 선택한 코인으로 데이터 갱신 로직 연결
    }
  });
}
