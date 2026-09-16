/* MAFIVERA V1 — final map + mobile navigation fix */
(()=>{'use strict';
if(window.__mtrwFinalMapNavFix)return;window.__mtrwFinalMapNavFix=true;
const css=document.createElement('style');
css.id='mtrw-final-map-nav-fix';
css.textContent=`
html,body,#gameRoot,.mafivera-game{width:100%!important;height:100%!important;min-height:100%!important;overflow:hidden!important}
.world-map{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;min-height:100%!important;background:#0b1016!important;overflow:hidden!important}
.world-map .leaflet-container,.world-map .leaflet-map-pane{width:100%!important;height:100%!important}
.world-map .leaflet-container{background:#111820!important;filter:none!important}
.world-map .leaflet-tile{opacity:.92!important;filter:brightness(.78) saturate(.78)!important}
.world-map .leaflet-tile-container{visibility:visible!important}
.bottom-nav{position:fixed!important;left:8px!important;right:8px!important;bottom:max(8px,env(safe-area-inset-bottom))!important;width:auto!important;height:74px!important;margin:0!important;padding:7px!important;display:grid!important;grid-template-columns:repeat(6,minmax(0,1fr))!important;gap:4px!important;transform:none!important;translate:none!important;z-index:1000!important;border-radius:22px!important}
.bottom-nav .bottom-btn{width:100%!important;min-width:0!important;margin:0!important;height:58px!important;padding:5px 2px!important;display:flex!important;align-items:center!important;justify-content:center!important;flex-direction:column!important;position:static!important;transform:none!important}
@media(max-width:520px){.bottom-nav{left:6px!important;right:6px!important;height:68px!important;padding:5px!important;border-radius:20px!important}.bottom-nav .bottom-btn{height:56px!important}.bottom-nav .bottom-btn span{font-size:20px!important}.bottom-nav .bottom-btn small{font-size:8px!important;white-space:nowrap!important}}
`;
document.head.appendChild(css);
const forceMap=()=>{
 const map=window.__mtrwLeafletMap;
 if(!map||!window.L)return false;
 try{
  map.invalidateSize(true);
  let hasOSM=false;
  map.eachLayer(layer=>{
   if(layer instanceof L.TileLayer){
    const url=layer._url||'';
    if(url.includes('openstreetmap.org'))hasOSM=true;
    else map.removeLayer(layer);
   }
  });
  if(!hasOSM){
   const osm=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,keepBuffer:6,updateWhenZooming:false,attribution:'© OpenStreetMap contributors'});
   osm._mtrwFinalOSM=true;
   osm.on('tileerror',()=>console.warn('MAFIVERA OSM tile error'));
   osm.addTo(map);
  }
  map.invalidateSize(true);
  return true;
 }catch(e){console.warn('MAFIVERA final map fix',e);return false}
};
const fix=()=>{forceMap();const nav=document.querySelector('.bottom-nav');if(nav){nav.style.setProperty('left','8px','important');nav.style.setProperty('right','8px','important');nav.style.setProperty('transform','none','important');nav.style.setProperty('width','auto','important');return true}return false};
let tries=0;const timer=setInterval(()=>{if(fix()||++tries>120)clearInterval(timer)},250);
window.addEventListener('resize',()=>setTimeout(fix,100));
window.addEventListener('orientationchange',()=>setTimeout(fix,300));
})();
