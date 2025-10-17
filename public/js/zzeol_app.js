/* ====== 안정형 실시간 연결 매니저 ====== */
const UPBIT_WS_URL = "wss://api.upbit.com/websocket/v1";
let WS = null;
let wsAlive = false;
let wsPingTimer = null;
let wsBackoff = 1000;            // 1s 시작
const WS_BACKOFF_MAX = 60000;    // 60s 상한
let restTickerTimer = null;
let restOrderbookTimer = null;

function setStatus(text){ const el=document.getElementById('ws-status'); if(el) el.textContent = text; }

/* 현재 구독 코드 구성: 선택코인 + 목록에 보이는 코드(최대 50개로 제한) */
function currentSubCodes(){
  const codes = new Set();
  if (typeof currentCode === 'string') codes.add(currentCode);
  (visibleCodes||[]).slice(0,50).forEach(c=>codes.add(c));
  // 기본값
  if (!codes.size) codes.add((baseMarket||'KRW') + '-BTC');
  return Array.from(codes);
}

/* WS 구독 메시지 송신 */
function wsSubscribe(){
  if (!WS || WS.readyState !== 1) return;
  const payload = [
    { ticket: "zzeolwallet" },
    { type: "ticker", codes: currentSubCodes() },
    { format: "SIMPLE" }
  ];
  try { WS.send(JSON.stringify(payload)); } catch(_) {}
}

/* Keepalive Ping */
function startPing(){
  stopPing();
  wsPingTimer = setInterval(()=> {
    if (!WS || WS.readyState !== 1) return;
    try { WS.send('ping'); } catch(_){}
  }, 20000); // 20s
}
function stopPing(){ if(wsPingTimer){clearInterval(wsPingTimer); wsPingTimer=null;} }

/* REST 백업 루프: WS 끊긴 동안만 동작 */
function startRestLoop(code){
  stopRestLoop();
  const c = code || currentSubCodes()[0];
  restTickerTimer = setInterval(()=> restFetchTicker(c), 1000);
  restOrderbookTimer = setInterval(()=> restFetchOrderbook(c), 2000);
  // 즉시 1회
  restFetchTicker(c); restFetchOrderbook(c);
  setStatus('REST 백업모드 — 1~2초 갱신');
}
function stopRestLoop(){
  if(restTickerTimer){clearInterval(restTickerTimer); restTickerTimer=null;}
  if(restOrderbookTimer){clearInterval(restOrderbookTimer); restOrderbookTimer=null;}
}

/* WS 연결 */
function connectWS(){
  // 기존 연결 정리
  if (WS) { try{WS.close();}catch(_){ } WS=null; }
  wsAlive = false;

  try {
    WS = new WebSocket(UPBIT_WS_URL);
  } catch(e) {
    // 브라우저/망 차단 → 백업 루프
    setStatus('WS 생성 실패 — REST 백업모드 전환');
    startRestLoop();
    scheduleReconnect();
    return;
  }

  WS.binaryType = 'arraybuffer';

  WS.onopen = () => {
    wsAlive = true;
    setStatus('WS 연결됨 — 실시간');
    stopRestLoop();       // 백업 중이면 종료
    wsBackoff = 1000;     // 백오프 리셋
    wsSubscribe();        // 재구독
    startPing();          // keepalive
  };

  WS.onmessage = (ev) => {
    // 업비트는 바이너리/텍스트 둘 다 가능 → 안전파서
    let data = null;
    try {
      if (ev.data instanceof ArrayBuffer) {
        const txt = new TextDecoder().decode(new Uint8Array(ev.data));
        data = JSON.parse(txt);
      } else if (typeof ev.data === 'string') {
        data = JSON.parse(ev.data);
      }
    } catch(_) { /* 확장프로그램 주입 텍스트 섞여도 건너뜀 */ }

    if (!data) return;

    // 티커/오더북 등 분기 — 기존 렌더 함수 재사용
    if (data.type === 'ticker' || data.trade_price || data.tp) {
      // SIMPLE 포맷 대비
      const t = {
        market: data.code || data.market,
        trade_price: data.trade_price || data.tp,
        signed_change_rate: (typeof data.signed_change_rate === 'number') ? data.signed_change_rate : (data.scr ?? 0),
        high_price: data.high_price || data.hp || 0,
        low_price: data.low_price || data.lp || 0,
        acc_trade_price_24h: data.acc_trade_price_24h || data.atp24h || 0,
        change: data.change || data.chg || null
      };
      renderTicker(t);
    }
    // (필요 시 orderbook 채널도 추가 가능)
  };

  WS.onerror = () => {
    wsAlive = false;
    setStatus('WS 오류 — 재시도 준비');
  };

  WS.onclose = () => {
    wsAlive = false;
    stopPing();
    // 즉시 백업 시작
    startRestLoop();
    scheduleReconnect();
  };
}

/* 재연결 스케줄러(지수 백오프) */
function scheduleReconnect(){
  const delay = wsBackoff;
  wsBackoff = Math.min(wsBackoff * 2, WS_BACKOFF_MAX);
  setStatus(`WS 재연결 대기 ${Math.round(delay/1000)}s…`);
  setTimeout(connectWS, delay);
}

/* 선택코드 변경 시: WS 재구독 + REST 즉시 1회 */
function selectCode(code){
  if(!code) return;
  currentCode = code;
  // REST 즉시표시
  restFetchTicker(code); restFetchOrderbook(code);
  // WS 구독 갱신
  wsSubscribe();
}

/* 탭 가시성/네트워크 이벤트 */
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    // 숨김 상태에서는 ping 최소화 (필요시 유지)
    stopPing();
  } else {
    // 다시 보이면 즉시 정상화
    if (wsAlive) startPing(); else connectWS();
  }
});
window.addEventListener('online',  () => { setStatus('네트워크 복구 — 재연결'); connectWS(); });
window.addEventListener('offline', () => { setStatus('오프라인 — REST 백업모드'); startRestLoop(); });

/* 초기 가동 */
setTimeout(connectWS, 0);
