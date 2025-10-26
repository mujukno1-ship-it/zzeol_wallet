// === 전역 설정 ===
// Cloudflare Worker 프록시를 쓰고 싶으면 아래 주소 입력.
// 비우면(=null) 공개 API로 바로 붙습니다.
window.PROXY_BASE = "https://satoshi-proxy.mujukno1.workers.dev"; // 없으면 null

// 기본 심볼 (검색 입력이 비어있을 때 사용)
window.DEFAULT_SYMBOL = "BTC";
