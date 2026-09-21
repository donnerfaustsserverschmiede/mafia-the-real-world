/* MAFIVERA – map cleanup: readable fields, no symbol brackets/grid clutter */
(()=>{'use strict';
function apply(){
  const map=window.__mtrwMap;
  if(!map)return false;
  const clean=()=>{
    const zoom=map.getZoom();
    document.querySelectorAll('.mtrw-resource-marker span').forEach(el=>{
      if(el.classList.contains('material'))el.textContent='◆';
      else if(el.classList.contains('weapon_parts'))el.textContent='⚙';
    });
    document.querySelectorAll('.mtrw-resource-marker,.res-marker').forEach(el=>{
      el.style.display=zoom>=16?'':'none';
    });
    (window.__mtrwGridRects||[]).forEach(rect=>{
      try{
        const o=rect.options||{};
        if(o.fillOpacity===0){
          rect.setStyle({color:'transparent',weight:0,fillOpacity:0});
        }
      }catch(_){}
    });
  };
  if(!window.__mtrwMapCleanupBound){
    window.__mtrwMapCleanupBound=true;
    map.on('zoomend moveend',clean);
  }
  clean();
  return true;
}
if(!apply()){
  let n=0;
  const t=setInterval(()=>{if(apply()||++n>120)clearInterval(t)},100);
}
})();