/* MAFIVERA – map density / resource marker fix */
(()=>{'use strict';
function install(){
  const map=window.__mtrwMap;
  if(!map||window.__mtrwMapDensityFixInstalled)return false;
  window.__mtrwMapDensityFixInstalled=true;
  const style=document.createElement('style');
  style.id='mtrw-map-density-fix';
  style.textContent=`
    .mf-map .leaflet-marker-icon.res-marker{
      width:18px!important;height:18px!important;
      opacity:.92!important;
      pointer-events:none!important;
    }
    .mf-map .leaflet-marker-icon.res-marker span{
      width:12px!important;height:12px!important;
      margin:3px!important;
      border-radius:50%!important;
      font-size:0!important;line-height:12px!important;
      border:1px solid rgba(255,255,255,.65)!important;
      box-shadow:0 1px 4px rgba(0,0,0,.65)!important;
    }
    .mf-map .leaflet-marker-icon.res-marker span.money{background:#f0c34c!important}
    .mf-map .leaflet-marker-icon.res-marker span.material{background:#52dfb0!important}
    .mf-map .leaflet-marker-icon.res-marker span.reputation{background:#e9b8ff!important}
    .mf-map .leaflet-marker-icon.res-marker span.weapon_parts{background:#ff9f43!important}
    @media(max-width:700px){
      .mf-map .leaflet-marker-icon.res-marker{width:16px!important;height:16px!important}
      .mf-map .leaflet-marker-icon.res-marker span{width:10px!important;height:10px!important;margin:3px!important}
    }
  `;
  document.head.appendChild(style);
  const sync=()=>{
    const z=map.getZoom();
    const visible=z>=16;
    map.getContainer().querySelectorAll('.leaflet-marker-icon.res-marker').forEach(el=>{
      el.style.display=visible?'':'none';
    });
  };
  map.on('zoomend moveend',sync);
  sync();
  return true;
}
if(!install()){
  let tries=0;
  const timer=setInterval(()=>{if(install()||++tries>100)clearInterval(timer)},100);
}
})();