// js/warmup.js

// ✅ 예열 코인 목록을 화면에 보여주는 간단한 함수
window.renderWarmup = function(list, { mount }) {
  mount.innerHTML = `
    <table>
      <tr><th>코인명</th><th>가격</th><th>변동률</th></tr>
      ${list.map(r => `
        <tr>
          <td>${r.symbol}</td>
          <td>${Number(r.price).toLocaleString()} 원</td>
          <td style="color:${r.change >= 0 ? '#00ff99' : '#ff6666'}">
            ${(r.change * 100).toFixed(2)}%
          </td>
        </tr>
      `).join('')}
    </table>
  `;
};

// ✅ 데이터를 불러오는 함수 (지금은 임시 JSON 예시)
window.loadWarmup = async function() {
  // 나중에 API 연동되면 아래 주소만 바꾸면 됨
  const res = await fetch('/data/warmup.json');
  return res.json();
};
