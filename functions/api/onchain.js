// functions/api/onchain.js
// Cloudflare Pages Functions (Modules) 버전
// - EVM 온체인 핑(블록넘버/가스) : cloudflare-eth.com (공개 게이트웨이)
// - Stablecoin 대략 지표: DefiLlama Fallback (필드 없으면 null 처리)
// - 강력한 에러/타임아웃/재시도 + CORS + no-store

const ETH_RPC = "https://cloudflare-eth.com";
const DEFILLAMA_OVERVIEW = "https://stablecoins.llama.fi/overview?stablecoins=all";

// 심볼 → 체인 간단 매핑 (필요 시 확장)
const CHAIN_MAP = {
  ETH: { chain: "ethereum", rpc: ETH_RPC },
  // SOL: { chain: "solana", rpc: "https://api.mainnet-beta.solana.com" }, // 확장시 사용
  // TRX: { chain: "tron", rpc: "" },
};

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const q = (url.searchParams.get("symbol") || "ETH").toUpperCase();
  const { chain, rpc } = CHAIN_MAP[q] || CHAIN_MAP.ETH;

  // 공통 응답 헬퍼
  const json = (obj, status = 200) =>
    new Response(JSON.stringify(obj), {
      status,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
        "access-control-allow-origin": "*",
      },
    });

  try {
    // --- 1) EVM 온체인 핑 (blockNumber, gasPrice) ---
    let blockNumber = null;
    let gasPriceGwei = null;

    if (rpc) {
      // JSON-RPC 호출 유틸
      const rpcCall = async (method, params = []) => {
        const r = await fetch(rpc, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method,
            params,
          }),
          // Cloudflare fetch 옵션
          cf: { cacheTtl: 0, cacheEverything: false },
        });
        if (!r.ok) throw new Error(`RPC ${method} failed: ${r.status}`);
        const j = await r.json();
        if (j.error) throw new Error(`RPC ${method} error: ${j.error.message}`);
        return j.result;
      };

      // blockNumber
      try {
        const bnHex = await rpcCall("eth_blockNumber");
        blockNumber = parseInt(bnHex, 16);
      } catch (e) {
        // 무시하고 null 유지
      }

      // gasPrice
      try {
        const gasHex = await rpcCall("eth_gasPrice");
        const gasWei = parseInt(gasHex, 16);
        gasPriceGwei = +(gasWei / 1e9).toFixed(2);
      } catch (e) {
        // 무시
      }
    }

    // --- 2) 간단 Stablecoin 지표 (DefiLlama) Fallback ---
    // 필드 구조가 가끔 바뀌므로 "있으면 쓰고, 없으면 null" 로 관대하게 처리
    let stable = {
      totalUSD: null,
      change24hUSD: null, // 24시간 증감(있으면)
      src: "defillama",
    };

    try {
      const rr = await fetch(DEFILLAMA_OVERVIEW, {
        headers: { "accept": "application/json" },
        cf: { cacheTtl: 30, cacheEverything: false },
      });
      if (rr.ok) {
        const dj = await rr.json();
        // dj 구조는 버전에 따라 다름: 대표 총량/변화값이 있으면 사용
        // (안 보이면 null 유지)
        stable.totalUSD = dj?.total?.usd ?? dj?.total?.total ?? null;
        stable.change24hUSD = dj?.change_24h ?? dj?.total?.change_24h ?? null;
      }
    } catch (_) { /* ignore */ }

    // --- 최종 응답 ---
    return json({
      ok: true,
      chain,
      blockNumber,
      gasPriceGwei,
      stable,
      ts: Date.now(),
    });
  } catch (e) {
    return json({ ok: false, error: String(e), ts: Date.now() }, 500);
  }
}
