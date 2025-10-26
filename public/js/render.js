// public/js/modules/render.js
export function renderPremium({kimpPct, upbitPrice, usdkrw, globalUsd, src, updatedAt}){
  setText("kimpPct", fmtPct(kimpPct));
  setText("upbitPrice", fmtNum(upbitPrice) + " ₩");
  setText("usdkrw", usdkrw ?? "-");
  setText("globalUsd", globalUsd ?? "-");
  setText("src", [src?.global, src?.fx, src?.krw].filter(Boolean).join(" / ") || "-");
  setText("updated", updatedAt ? new Date(updatedAt).toLocaleString() : new Date().toLocaleString());
}
export function renderOnchain({tvl, src}){
  setText("tvl", tvl!=null ? (Number(tvl).toLocaleString() + " USD") : "-");
  setText("tvlSrc", src ?? "-");
}
export function renderSignals({nowPrice, buyPrice, sellPrice, stopPrice, risk, comment}){
  setText("nowPrice", nowPrice ? fmtNum(nowPrice)+" ₩" : "-");
  setText("buyPrice", buyPrice ? fmtNum(buyPrice)+" ₩" : "-");
  setText("sellPrice", sellPrice ? fmtNum(sellPrice)+" ₩" : "-");
  setText("stopPrice", stopPrice ? fmtNum(stopPrice)+" ₩" : "-");
  setText("riskScore", risk);
  setText("comment", comment);
}

function setText(id, v){ const el=document.getElementById(id); if(el) el.textContent = v; }
function fmtNum(n){ return Number(n).toLocaleString(); }
function fmtPct(x){ return (x==null) ? "-" : `${x.toFixed(2)}%`; }
