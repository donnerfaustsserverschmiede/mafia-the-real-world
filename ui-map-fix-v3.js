/* MAFIVERA V1 — definitive map + mobile navigation repair */
(()=>{'use strict';
if(window.__mtrwMapFixV3)return;window.__mtrwMapFixV3=true;
const style=document.createElement('style');
style.textContent=`
#gameRoot,.mafivera-game,.world-map,.world-map .leaflet-container{position:fixed!important;inset:0!important;width:100%!important;height:100%!important;min-width:0!important;min-height:100%!important}
.world-map{z-index:1!important;background:#10161d!important}
.world-map .leaflet-container{z-index:1!important;background:#10161d!important}
.leaflet-tile-pane{filter:brightness(.72) saturate(.72) contrast(1.08)!important}
.leaflet-tile{opacity:1!important}
.bottom-nav{position:absolute!important;left:10px!important;right:10px!important;bottom:max(10px,env(safe-area-inset-bottom))!important;width:auto!important;height:76px!important;transform:none!important;display:grid!important;grid-template-columns:repeat(6,minmax(0,1fr))!important;gap:3px!important;z-index:100!important;overflow:hidden!important}
.bottom-nav .bottom-btn{display:flex!important;min-width:0!important;width:100%!important}
@media(max-width:520px){.bottom-nav{left:7px!important;right:7px!important;height:72px!important;border-radius:22px!important}.bottom-nav .bottom-btn span{font-size:19px!important}.bottom-nav .bottom-btn small{font-size:7px!important}}
`;
document.head.appendChild(style);
const osmUrl='https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const install=()=>{
 const map=window.__mtrwLeafletMap;
 if(!map||!window.L)return false;
 try{
   if(map.__mtrwOsmFix)return true;
   map.eachLayer(layer=>{
     if(layer instanceof L.TileLayer)map.removeLayer(layer);
   });
   const layer=L.tileLayer(osmUrl,{maxZoom:19,keepBuffer:6,updateWhenZooming:false,updateWhenIdle:false,attribution:'© OpenStreetMap contributors'});
   layer.addTo(map);
   map.__mtrwOsmFix=layer;
   setTimeout(()=>map.invalidateSize(true),100);
   setTimeout(()=>map.invalidateSize(true),700);
   return true;
 }catch(e){console.warn('MAFIVERA definitive map repair',e);return false}
};
const layout=()=>{
 const nav=document.querySelector('.bottom-nav');
 if(nav){nav.style.setProperty('left','7px','important');nav.style.setProperty('right','7px','important');nav.style.setProperty('width','auto','important');nav.style.setProperty('transform','none','important');nav.style.setProperty('grid-template-columns','repeat(6,minmax(0,1fr))','important');nav.style.setProperty('display','grid','important');nav.style.setProperty('z-index','100','important')}
 const map=window.__mtrwLeafletMap;if(map?.invalidateSize)map.invalidateSize(true);
};
let tries=0;
const boot=()=>{layout();install();if(++tries<120)setTimeout(boot,250)};
new MutationObserver(()=>{layout();install()}).observe(document.documentElement,{childList:true,subtree:true});
boot();
})();
