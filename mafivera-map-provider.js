/* MAFIVERA V1 — stable public map provider */
(()=>{'use strict';
const boot=()=>{const map=window.mtrwMap||window.__mtrwLeafletMap;if(!map||!window.L){setTimeout(boot,250);return}
let found=[];map.eachLayer(l=>{if(l instanceof L.TileLayer)found.push(l)});found.forEach(l=>{try{map.removeLayer(l)}catch(e){}});
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{subdomains:['a','b','c'],maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'}).addTo(map);
const s=document.createElement('style');s.textContent='.leaflet-control-attribution{display:block!important;background:rgba(5,8,13,.78)!important;color:#c7d0d9!important;font-size:9px!important;padding:2px 5px!important}.leaflet-control-attribution a{color:#fff!important}.leaflet-tile{filter:brightness(.52) saturate(.62) contrast(1.08)!important}';document.head.appendChild(s);
};boot();
})();
