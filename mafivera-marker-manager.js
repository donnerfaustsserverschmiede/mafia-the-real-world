/* MAFIVERA V2 — persistent map markers
   Resources stay owned by this engine.
   Building blips keep their icons and labels without black boxes.
   Dealer remains exclusively owned by dealer-v2. */
(()=>{'use strict';
if(window.__mtrwResourceMarkerEngine)return;
window.__mtrwResourceMarkerEngine=true;
const GLAT=.0018,GLNG=.0025,R=5;
let map=null,resourceLayer=null,lastKey='';
const res=(r,c)=>{const h=Math.abs((r*73856093)^(c*19349663))%6;return h===0?['money','material']:h===1?['material','reputation']:h===2?['money','reputation']:h===3?['material','money']:h===4?['reputation','money']:['material','reputation']};
const icon=x=>x==='money'?'$':x==='material'?'▣':'★';
function style(){if(document.getElementById('mtrwResourceMarkerCSS'))return;const s=document.createElement('style');s.id='mtrwResourceMarkerCSS';s.textContent=`
.res-marker .material{display:none!important;visibility:hidden!important}
.res-marker{background:transparent!important;border:0!important}
.mtrw-resource-marker{background:transparent!important;border:0!important;width:26px!important;height:26px!important;pointer-events:none!important}
.mtrw-resource-marker .material{display:none!important;visibility:hidden!important}
.mtrw-resource-marker span{display:flex;align-items:center;justify-content:center;width:26px;height:26px;font:900 19px/26px system-ui,sans-serif;text-shadow:0 2px 4px #000,0 0 3px #000;filter:drop-shadow(0 1px 2px #000)}
.mtrw-resource-marker .money{color:#ffd34d}.mtrw-resource-marker .reputation{color:#ff8ee6}
/* Building blips: keep the actual icon, remove the black box around the label. */
.building-marker{background:transparent!important;border:0!important;text-align:center;box-shadow:none!important}
.building-marker span{display:block;font-size:30px;line-height:30px;filter:drop-shadow(0 2px 4px #000)}
.building-marker b{display:block;background:transparent!important;border:0!important;border-radius:0!important;padding:2px 5px;font-size:8px;white-space:nowrap;color:#fff;text-shadow:0 2px 4px #000,0 0 3px #000;box-shadow:none!important}
`;document.head.appendChild(s)}
function renderResources(){if(!map||!resourceLayer)return;const c=map.getCenter(),r0=Math.floor(c.lat/GLAT),c0=Math.floor(c.lng/GLNG),key=`${r0}:${c0}`;if(key===lastKey)return;lastKey=key;resourceLayer.clearLayers();for(let r=r0-R;r<=r0+R;r++)for(let c=c0-R;c<=c0+R;c++){const [lat,lng]=[(r+.5)*GLAT,(c+.5)*GLNG];res(r,c).forEach((p,i)=>{if(p==='material')return;L.marker([lat+(i?0.00025:-0.00025),lng+(i?0.00032:-0.00032)],{interactive:false,zIndexOffset:1000,icon:L.divIcon({className:'mtrw-resource-marker',html:`<span class="${p}">${icon(p)}</span>`,iconSize:[26,26],iconAnchor:[13,13]})}).addTo(resourceLayer)})}}
function boot(){map=window.__mtrwMap;if(!map||typeof L==='undefined')return;style();resourceLayer=L.layerGroup().addTo(map);renderResources();map.on('moveend',renderResources);map.on('zoomend',()=>{lastKey='';renderResources()})}
const wait=setInterval(()=>{if(window.__mtrwMap){clearInterval(wait);boot()}},250);setTimeout(()=>clearInterval(wait),30000);
})();