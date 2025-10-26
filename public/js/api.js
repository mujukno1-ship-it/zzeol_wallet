(function () {
  const fmt = new Intl.NumberFormat("ko-KR");
  const fmtUSD = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
  const fmtKRW = new Intl.NumberFormat("ko-KR");

  function n(x, d = 0) {
    if (x === null || x === undefined || !isFinite(x)) return "-";
    return d ? x.toFixed(d) : fmt.format(Math.round(x));
  }

  async function getJson(url, init) {
    const res = await fetch(url, init);
    if (!res.ok) throw new Error(`HTTP ${res.status} @ ${url}`);
    return res.json();
  }

  // 프록시가 있으면 프록시 경유 요청
  async function getViaProxy(path) {
    if (!window.PROXY_BASE) throw new Error("NO_PROXY");
    return getJson(`${window.PROXY_BASE}${path}`);
  }

  window.$api = {
    getJson,
    getViaProxy,
    n,
    fmt,
    fmtUSD,
    fmtKRW,
  };
})();
