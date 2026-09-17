/* MAFIVERA V2 — clean resource tile markers
   Exactly ONE resource icon per map tile.
   Legacy V1 resource markers are hidden so they cannot duplicate these.
   The resource is centered in its tile and remains stable while panning.
   Building blips are intentionally disabled here. Dealer remains exclusively owned by dealer-v2. */
(()=>{'use strict';
if(window.__mtrwResourceMarkerEngine)return;
window.__mtrwResourceMarkerEngine=true;
const GLAT=.0018,GLNG=.0025,R=5;
let map=null,resourceLayer=null,lastKey='';
const resources=['money','material','reputation'];
const icon=x=>x==='money'?'$':x==='material'?'▣':'★';
function resourceForTile(r,c){const n=Math.abs((r*73856093)^(c*19349663))%resources.length;return resources[n]}
function style(){if(document.getElementById('mtrwResourceMarkerCSS'))return;const s=document.createElement('style');s.id='mtrwResourceMarkerCSS';s.textContent=`
/* V1 legacy resource markers: never show them. */
.res-marker{display:none!important;visibility:hidden!important}
/* No building icons on the map. */
.building-marker,.mtrw-stable-building-marker{display:none!important;visibility:hidden!important}
.building-marker b,.mtrw-stable-building-marker b{display:none!important}
.mtrw-resource-marker{background:transparent!important;border:0!important;width:30px!important;height:30px!important;pointer-events:none!important}
.mtrw-resource-marker span{display:flex;align-items:center;justify-content:center;width:30px;height:30px;font:900 21px/30px system-ui,sans-serif;text-shadow:0 2px 4px #000,0 0 3px #000;filter:drop-shadow(0 1px 2px #000)}
.mtrw-resource-marker .money{color:#ffd34d}.mtrw-resource-marker .material{color:#b9d7ff}.mtrw-resource-marker .reputation{color:#ff8ee6}
`;document.head.appendChild(s)}
function renderResources(){if(!map||!resourceLayer)return;const center=map.getCenter(),r0=Math.floor(center.lat/GLAT),c0=Math.floor(center.lng/GLNG),key=`${r0}:${c0}:${map.getZoom()}`;if(key===lastKey)return;lastKey=key;resourceLayer.clearLayers();for(let r=r0-R;r<=r0+R;r++)for(let c=c0-R;c<=c0+R;c++){const lat=(r+.5)*GLAT,lng=(c+.5)*GLNG,p=resourceForTile(r,c);L.marker([lat,lng],{interactive:false,zIndexOffset:1000,icon:L.divIcon({className:'mtrw-resource-marker',html:`<span class="${p}">${icon(p)}</span>`,iconSize:[30,30],iconAnchor:[15,15]})}).addTo(resourceLayer)}}
function boot(){map=window.__mtrwMap;if(!map||typeof L==='undefined')return;style();resourceLayer=L.layerGroup().addTo(map);renderResources();map.on('moveend',renderResources);map.on('zoomend',()=>{lastKey='';renderResources()})}
const wait=setInterval(()=>{if(window.__mtrwMap){clearInterval(wait);boot()}},250);setTimeout(()=>clearInterval(wait),30000);
})();