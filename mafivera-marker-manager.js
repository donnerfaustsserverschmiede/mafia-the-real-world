/* MAFIVERA V2 — official resource marker layer
   Exactly ONE resource icon per map tile.
   The legacy runtime may still create V1 resource markers; they are hidden below.
   Building markers are hidden here to prevent duplicate/legacy map blips. */
(()=>{'use strict';
if(window.__mtrwResourceMarkerEngine)return;
window.__mtrwResourceMarkerEngine=true;
const GLAT=.0018,GLNG=.0025,R=5,resources=['money','material','reputation','weapon_parts'];
let map=null,layer=null,lastKey='';
const icon=x=>x==='money'?String.fromCharCode(36):x==='material'?'▣':x==='reputation'?'★':'⚙';
const baseResourceForTile=(r,c)=>{const h=Math.abs(r*73856093+c*19349663)%100;return h<5?'weapon_parts':h<45?'money':h<80?'material':'reputation'};
function style(){if(document.getElementById('mtrwResourceMarkerCSS'))return;const s=document.createElement('style');s.id='mtrwResourceMarkerCSS';s.textContent=`
.res-marker{display:none!important;visibility:hidden!important}
.building-marker,.mtrw-stable-building-marker{display:none!important;visibility:hidden!important}
.building-marker b,.mtrw-stable-building-marker b{display:none!important}
.mtrw-resource-marker{background:transparent!important;border:0!important;width:30px!important;height:30px!important;pointer-events:none!important}
.mtrw-resource-marker span{display:flex;align-items:center;justify-content:center;width:30px;height:30px;font:900 21px/30px system-ui,sans-serif;text-shadow:0 2px 4px #000,0 0 3px #000;filter:drop-shadow(0 1px 2px #000)}
.mtrw-resource-marker .money{color:#ffd34d}.mtrw-resource-marker .material{color:#b9d7ff}.mtrw-resource-marker .reputation{color:#ff8ee6}.mtrw-resource-marker .weapon_parts{color:#ffb84d}
`;document.head.appendChild(s)}
function render(){if(!map||!layer)return;const center=map.getCenter(),r0=Math.floor(center.lat/GLAT),c0=Math.floor(center.lng/GLNG),key=`${r0}:${c0}:${map.getZoom()}`;if(key===lastKey)return;lastKey=key;layer.clearLayers();const visible=[];for(let r=r0-R;r<=r0+R;r++)for(let c=c0-R;c<=c0+R;c++)visible.push({r,c});for(const q of visible){const lat=(q.r+.5)*GLAT,lng=(q.c+.5)*GLNG,stored=window.__mtrwWorld?.[q.r+'_'+q.c]||window.__mtrwWorld?.['z_'+q.r+'_'+q.c],p=stored?.resources?.[0]||baseResourceForTile(q.r,q.c);L.marker([lat,lng],{interactive:false,zIndexOffset:1000,icon:L.divIcon({className:'mtrw-resource-marker',html:'<span class="'+p+'">'+icon(p)+'</span>',iconSize:[30,30],iconAnchor:[15,15]})}).addTo(layer)}}
function boot(){map=window.__mtrwMap;if(!map||typeof L==='undefined')return;style();layer=L.layerGroup().addTo(map);render();map.on('moveend',render);map.on('zoomend',()=>{lastKey='';render()})}
const wait=setInterval(()=>{if(window.__mtrwMap){clearInterval(wait);boot()}},250);setTimeout(()=>clearInterval(wait),30000);
})();