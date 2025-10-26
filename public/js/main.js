const API_BASE_URL = "https://satoshi-proxy.mujukno1.workers.dev";

import { AppState } from "./state.js";
import { apiPremium, apiOnchain } from "./api.js";
import { renderPremium, renderOnchain, renderCommentary, renderTopError } from "./render.js";

async function loadAll() {
  try {
    const [p, o] = await Promise.all([
      apiPremium(AppState.symbolKimp),
      apiOnchain(AppState.symbolOnchain),
    ]);

    if (!p?.ok) throw new Error("premium api failed");
    if (!o?.ok) throw new Error("onchain api failed");

    AppState.premium  = p;
    AppState.onchain  = o;
    AppState.updatedAt = new Date().toISOString();

    renderPremium(p);
    renderOnchain(o);
    renderCommentary("시장 눈치 보기. 손절 라인 먼저!", AppState.updatedAt);
  } catch (e) {
    console.error(e);
    renderTopError("데이터 불러오기에 실패했습니다 (프록시/경로/CORS 확인).");
    renderCommentary("데이터 조회 오류. 잠시 후 다시 시도해주세요.", new Date().toISOString());
  }
}

function wireSearch() {
  const input = document.querySelector("input#search-input");
  const clearBtn = document.querySelector("#search-clear");
  if (!input) return;

  // 엔터로 검색
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const q = (input.value || "").trim();
      if (!q) return;

      // 한글/영문 코인명 → 심볼 맵핑이 있다면 여기에 넣어도 OK. 일단 심볼 그대로 씁니다.
      AppState.symbolKimp = q.toUpperCase();
      AppState.symbolOnchain = q.toUpperCase();
      loadAll();
    }
  });

  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      input.value = "";
      AppState.symbolKimp = "BTC";
      AppState.symbolOnchain = "ETH";
      loadAll();
    });
  }
}

window.addEventListener("DOMContentLoaded", () => {
  wireSearch();
  loadAll();
});
