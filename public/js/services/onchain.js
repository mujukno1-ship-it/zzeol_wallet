(function () {
  async function getOnchainTvl(symbol = "ETH") {
    // 심볼 -> 체인명 매핑(DefiLlama chains)
    const MAP = { BTC: "Bitcoin", ETH: "Ethereum", SOL: "Solana" };
    const chainName = MAP[symbol.toUpperCase()] || "Ethereum";

    // 프록시 선호: /api/onchain?symbol=ETH
    if (window.PROXY_BASE) {
      try {
        const j = await $api.getViaProxy(`/api/onchain?symbol=${symbol}`);
        return {
          ok: !!j.ok,
          symbol: symbol.toUpperCase(),
          chain: chainName,
          tvl: Number(j.tvl ?? 0),
          src: "DefiLlama",
          updatedAt: new Date().toISOString(),
        };
      } catch { /* fallthrough */ }
    }

    // 직접 DefiLlama 사용
    const chains = await $api.getJson("https://api.llama.fi/chains");
    const m = chains.find((x) => x.name === chainName);
    if (!m) return { ok: false, symbol, chain: chainName, tvl: null };
    return {
      ok: true,
      symbol: symbol.toUpperCase(),
      chain: chainName,
      tvl: Number(m.tvl ?? 0),
      src: "DefiLlama",
      updatedAt: new Date().toISOString(),
    };
  }

  window.$onchain = { getOnchainTvl };
})();
