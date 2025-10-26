// public/js/main.js
import { CONFIG, getPremium, getOnchain, health } from './api.js';
import { AppState } from './state.js';
import { makeSignal, makeOneLine } from './indicators.js';
import { renderPremium, renderOnchain, renderSignal, renderCommentary, renderHealth } from './render.js';
import { mountSearch } from './search.js';

async function loadAll(symbolForKimp = AppState.symbol, symbolForOnchain = AppState.onchainSymbol) {
  try {
    const [p, o] = await Promise.all([
      getPremium(symbolForKimp),
      getOnchain(symbolForOnchain),
    ]);
    AppState.symbol = p.symbol;
    AppState.onchainSymbol = o.symbol;
    AppState.premium = p;
    AppState.onchain = o;
    AppState.signal = makeSignal(p);
    AppState.commentary = makeOneLine(p, o);
    AppState.updatedAt = new Date().toISOString();

    renderPremium(document, p);
    renderOnchain(o);
    renderSignal(AppState.signal);
    renderCommentary(AppState.commentary, AppState.updatedAt);
  } catch (e) {
    console.error(e);
    renderCommentary('데이터 조회 오류. 잠시 후 다시 시도해주세요.', new Date().toISOString());
  }
}

async function boot() {
  // 프록시 헬스체크
  const h = await health();
  renderHealth(!!h.ok);

  // 초기 로딩
  await loadAll();

  // 검색 이벤트
  mountSearch(async (sym) => {
    // BTC면 onchain은 ETH 유지, ETH 검색 시 onchain도 ETH로
    const onchainSym = sym === 'ETH' ? 'ETH' : 'ETH';
    await loadAll(sym, onchainSym);
  });

  // 주기 업데이트
  setInterval(loadAll, CONFIG.REFRESH_MS);
}

boot();
