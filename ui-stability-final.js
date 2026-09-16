/* MAFIVERA — FINAL UI/MAP STABILITY LAYER */
(()=>{'use strict';
if(window.MAFIVERA_STABILITY_FINAL)return;
window.MAFIVERA_STABILITY_FINAL=true;
const style=document.createElement('style');
style.textContent=`
.leaflet-container,.leaflet-pane,.leaflet-layer,.leaflet-marker-icon,.leaflet-marker-shadow,.leaflet-popup{transition:none!important;animation:none!important}
.leaflet-overlay-pane svg,.leaflet-overlay-pane path,.leaflet-overlay-pane rect{transition:none!important;animation:none!important}
.bottom-nav,.drawer,.hud,.map-overlay,.toast{transition:none!important;animation:none!important}
`;
document.head.appendChild(style);
const dist=(a,b)=>{if(!a||!b)return 999999;const dLat=(a.lat-b.lat)*111320,dLng=(a.lng-b.lng)*111320*Math.cos((a.lat+b.lat)*Math.PI/360);return Math.hypot(dLat,dLng)};
const stabilizeMap=()=>{
 const m=window.mtrwMap||window.__mtrwLeafletMap;if(!m||m.__mafiveraStable)return;
 const native=m.setView.bind(m);
 m.setView=function(center,zoom,options){
   const c=Array.isArray(center)?{lat:Number(center[0]),lng:Number(center[1])}:{lat:Number(center?.lat),lng:Number(center?.lng)};
   const z=Number(zoom ?? m.getZoom());
   if(Number.isFinite(c.lat)&&Number.isFinite(c.lng)){
     const cur=m.getCenter();
     /* Ignore tiny GPS corrections. They were repeatedly moving the map,
        which triggered grid redraws and produced the visible flashing. */
     if(cur && dist(c,cur)<25 && z===m.getZoom())return m;
   }
   return native(center,zoom,options);
 };
 m.__mafiveraStable=true;
};
const stabilizeHeistLayer=()=>{
 const l=window.mtrwHeistLayer;if(!l||l.__mafiveraStable)return;
 let lastClear=0;const native=l.clearLayers.bind(l);
 l.clearLayers=function(){const now=Date.now();if(now-lastClear<4500)return l;lastClear=now;return native()};
 l.__mafiveraStable=true;
};
const run=()=>{stabilizeMap();stabilizeHeistLayer()};
run();setTimeout(run,250);setTimeout(run,1000);setInterval(run,2000);
})();
