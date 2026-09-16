/* MAFIVERA V1 — reliable Leaflet bootstrap + OSM tiles */
(()=>{
  'use strict';
  if(window.__mtrwMapRescue)return;
  window.__mtrwMapRescue=true;
  const patch=()=>{
    if(!window.L)return false;
    if(!window.__mtrwTileLayerPatch){
      window.__mtrwTileLayerPatch=true;
      const native=window.L.tileLayer;
      window.L.tileLayer=function(url,opts={}){
        if(typeof url==='string' && url.includes('basemaps.cartocdn.com/dark_all')){
          url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
          opts={...opts,subdomains:['a','b','c'],maxZoom:19,attribution:'© OpenStreetMap contributors'};
        }
        return native.call(this,url,opts);
      };
    }
    if(!window.__mtrwLeafletMapPatch){
      window.__mtrwLeafletMapPatch=true;
      const originalMap=L.map;
      L.map=function(){
        const map=originalMap.apply(this,arguments);
        window.__mtrwLeafletMap=map;
        setTimeout(()=>ensureTiles(map),50);
        return map;
      };
    }
    return true;
  };
  const ensureTiles=map=>{
    if(!map||!map._container||!window.L||map.__mtrwRescueLayer)return;
    try{
      const layer=L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
        maxZoom:19,subdomains:['a','b','c'],attribution:'© OpenStreetMap contributors',crossOrigin:true
      });
      layer.addTo(map);
      map.__mtrwRescueLayer=layer;
      setTimeout(()=>map.invalidateSize(true),100);
    }catch(e){console.warn('MAFIVERA map rescue failed',e)}
  };
  const start=()=>{
    if(window.L){patch();return}
    const s=document.createElement('script');
    s.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    s.onload=()=>{patch();window.dispatchEvent(new Event('mtrw:leaflet-ready'))};
    s.onerror=()=>{const f=document.createElement('script');f.src='https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js';f.onload=()=>patch();document.head.appendChild(f)};
    document.head.appendChild(s);
  };
  start();
})();
