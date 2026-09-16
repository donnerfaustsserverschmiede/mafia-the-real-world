/* MAFIVERA V1 — Map tile rescue */
(()=>{
  'use strict';
  if(window.__mtrwMapRescue)return;
  window.__mtrwMapRescue=true;
  const install=()=>{
    if(!window.L){setTimeout(install,100);return}
    if(!window.__mtrwLeafletMapPatch){
      window.__mtrwLeafletMapPatch=true;
      const originalMap=L.map;
      L.map=function(){
        const map=originalMap.apply(this,arguments);
        window.__mtrwLeafletMap=map;
        setTimeout(()=>ensureTiles(map),80);
        return map;
      };
    }
    if(window.__mtrwLeafletMap)setTimeout(()=>ensureTiles(window.__mtrwLeafletMap),250);
    setTimeout(install,1000);
  };
  const ensureTiles=map=>{
    if(!map||!map._container)return;
    if(map.__mtrwRescueLayer)return;
    try{
      const layer=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{
        maxZoom:19,
        attribution:'© OpenStreetMap contributors',
        crossOrigin:true,
        className:'mtrw-rescue-tiles'
      });
      layer.addTo(map);
      map.__mtrwRescueLayer=layer;
      setTimeout(()=>map.invalidateSize(),150);
    }catch(e){console.warn('MAFIVERA map rescue failed',e)}
  };
  install();
})();
