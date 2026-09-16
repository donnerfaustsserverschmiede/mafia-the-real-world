/* MAFIVERA V1 — safe map enhancer; never creates a second Leaflet map */
(()=>{'use strict';
if(window.__mtrwMapEngineV4)return;window.__mtrwMapEngineV4=true;
const css=document.createElement('style');css.textContent=`.world-map,.world-map .leaflet-container{width:100%!important;height:100%!important;min-height:0!important;touch-action:none!important}.world-map{position:absolute!important;inset:0!important;overflow:hidden!important}.leaflet-tile{opacity:1!important}`;document.head.appendChild(css);
const run=()=>{const map=window.__mtrwLeafletMap||window.__mtrwMapV4;if(!map)return setTimeout(run,250);try{map.invalidateSize(true);let hasTile=false;map.eachLayer(l=>{if(l instanceof L.TileLayer){hasTile=true;l.setOpacity(1)}});if(!hasTile)L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,keepBuffer:6,attribution:'© OpenStreetMap contributors'}).addTo(map)}catch(e){console.warn('MAFIVERA map enhancer',e)}};run();
})();
