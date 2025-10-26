// public/js/modules/state.js
export const state = {
  history: {
    premiumPct: [],   // 최근 프리미엄 %
    price: [],        // 최근 업비트 가격
  },
  maxPoints: 60,      // 10초 x 60 = 10분 히스토리
};

export function pushHistory(arr, val, max){
  if(val == null) return;
  arr.push(val);
  if(arr.length > max) arr.shift();
}

export function snapshot(){
  return JSON.parse(JSON.stringify(state));
}
