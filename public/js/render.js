// ==== render.js (시작)
const RENDER = (() => {
  function text(id, v){ const el=document.getElementById(id); if(el) el.textContent = v; }

  function paintPremium(p){
    if(!p || !p.ok){ text('kimchi-premium', '-'); return; }
    const prem = p.premiumPct==null ? null : Number(p.premiumPct).toFixed(2);
    const cls  = (p.premiumPct>0)?'bad':'good';
    document.getElementById('kimchi-premium').innerHTML =
      prem==null?'-':`<span class="${cls}">${prem}%</span>`;
    text('upbit-krw', IND.formatKRW(p.upbitPrice));
    text('global-usd', IND.formatUSD(p.globalUsd));
    text('usdkrw', Number(p.usdkrw||0).toLocaleString('ko-KR'));
    text('sources', `global: ${p.src?.global||'-'} / fx: ${p.src?.fx||'-'} / krw: ${p.src?.krw||'Upbit'}`);
  }

  function paintOnchain(o, symbol){
    text('sym-onchain', symbol);
    if(!o || !o.ok){ text('onchain-tvl','-'); return; }
    text('onchain-tvl', Number(o.tvl||0).toLocaleString('en-US',{maximumFractionDigits:0})+' USD');
  }

  function paintSignal(p){
    if(!p || !p.ok){ text('sig-price','-'); text('sig-buy','-'); text('sig-sell','-'); text('sig-stop','-'); text('sig-risk','-'); return; }
    const sig = IND.signalFromUpbitKRW(p.upbitPrice);
    text('sig-price', sig.priceKRW);
    text('sig-buy',   sig.buyKRW);
    text('sig-sell',  sig.sellKRW);
    text('sig-stop',  sig.stopKRW);
    text('sig-risk',  sig.risk);
  }

  function paintCommentary(p, o){
    const lines = [];
    if(p?.premiumPct!=null){
      const prem = p.premiumPct.toFixed(2);
      lines.push(`김프 ${prem}%`);
    }
    if(o?.tvl!=null){
      const t = Number(o.tvl).toLocaleString('en-US');
      lines.push(`TVL ${t} USD`);
    }
    const msg = lines.length? `시장 눈치 보기. 손절 라인 먼저! 🛡` : '-';
    text('commentary', msg);
    text('updated', new Date().toLocaleString());
  }

  return { paintPremium, paintOnchain, paintSignal, paintCommentary };
})();
// ==== render.js (끝)
