import { CONFIG } from "./config.js";
import { getPremium } from "./services/premium.js";
import { getOnchain } from "./services/onchain.js";

const el = {
  kimp: document.getElementById("kimp"),
  onchain: document.getElementById("onchain"),
  signal: document.getElementById("signal"),
  comment: document.getElementById("comment"),
  updated: document.getElementById("updated"),
  searchInput: document.querySelector(".search-input"),
  searchClear: document.getElementById("search-clear"),
};

function fmtNum(v, suffix = "") {
  if (v == null) return "-";
  if (typeof v === "number") return v.toLocaleString() + (suffix || "");
  const n = Number(v);
  return Number.isFinite(n) ? n.toLocaleString() + (suffix || "") : "-";
}

async function load(symbolPremium = CONFIG.PREMIUM_SYMBOL, symbolOnchain = CONFIG.ONCHAIN_SYMBOL) {
  try {
    const [kimp, chain] = await Promise.all([
      getPremium(symbolPremium),
      getOnchain(symbolOnchain),
    ]);

    // 김프 카드
    if (kimp?.ok) {
      el.kimp.innerHTML =
        `📈 김치 프리미엄: <b>${kimp.premiumPct?.toFixed(2) ?? "-" }%</b><br>` +
        `업비트 KRW: ${fmtNum(kimp.upbitPrice, " ₩")}<br>` +
        `글로벌 USD: ${kimp.globalUsd ?? "-"}<br>` +
        `USD/KRW: ${kimp.usdkrw ?? "-"}<br>` +
        `소스: ${kimp.src?.global ?? "-"} / ${kimp.src?.krw ?? "-"}`;
    } else {
      el.kimp.innerHTML = "데이터 불러오기 실패(김프)";
    }

    // 온체인 카드
    if (chain?.ok) {
      el.onchain.innerHTML =
        `💗 온체인 TVL(${chain.symbol}): <b>${fmtNum(chain.tvl, " USD")}</b><br>` +
        `소스: ${chain.src ?? "-"}`;
    } else {
      el.onchain.innerHTML = "데이터 불러오기 실패(온체인)";
    }

    // 시그널/코멘트(간단 고정)
    el.signal.innerHTML =
      `현재가: -<br>매수: -<br>매도: -<br>손절: -<br>위험도: - / 5`;
    el.comment.innerHTML = "시장 눈치 보기. 손절 라인 먼저! 🛡️";

    // 업데이트 시간
    el.updated.innerHTML = `업데이트: ${new Date().toLocaleString()}`;

  } catch (e) {
    console.error(e);
    el.kimp.innerHTML = "네트워크 오류";
    el.onchain.innerHTML = "네트워크 오류";
  }
}

// 검색 입력 → 엔터/초기화 처리
function initSearch() {
  if (!el.searchInput) return;

  el.searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const q = el.searchInput.value.trim();
      // 간단 매핑 예시
      const map = {
        "비트코인": { p: "BTC", c: "ETH" },
        "이더리움": { p: "ETH", c: "ETH" },
        "btc": { p: "BTC", c: "ETH" },
        "eth": { p: "ETH", c: "ETH" },
      };
      const pick = map[q.toLowerCase()] || { p: CONFIG.PREMIUM_SYMBOL, c: CONFIG.ONCHAIN_SYMBOL };
      load(pick.p, pick.c);
    }
  });

  if (el.searchClear) {
    el.searchClear.addEventListener("click", () => {
      el.searchInput.value = "";
      load(); // 기본 심볼 재조회
    });
  }
}

initSearch();
load();
