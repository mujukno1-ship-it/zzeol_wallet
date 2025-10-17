
(function(){
  const nowEl = document.getElementById('now');
  const reloadBtn = document.getElementById('reload');
  function pad(n){return String(n).padStart(2,'0')}
  function tick(){
    const d = new Date();
    nowEl.textContent = d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())+' '
      + pad(d.getHours())+':'+pad(d.getMinutes())+':'+pad(d.getSeconds());
  }
  tick();
  setInterval(tick, 1000);
  reloadBtn?.addEventListener('click', ()=>location.reload());
})();
