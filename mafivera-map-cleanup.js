/* MAFIVERA – map cleanup: readable fields, resource markers visible from normal play zoom */
(()=>{'use strict';
function apply(){
  const map=window.__mtrwMap;
  if(!map)return false;
  const clean=()=>{
    const zoom=map.getZoom();
    document.querySelectorAll('.mtrw-resource-marker span').forEach(el=>{
      if(el.classList.contains('material'))el.textContent='◆';
      else if(el.classList.contains('weapon_parts'))el.textContent='⚙';
      else if(el.classList.contains('money'))el.textContent='$';
      else if(el.classList.contains('reputation'))el.textContent='★';
    });
    /* Legacy V1 markers stay hidden; the official marker layer above owns resource icons. */
    document.querySelectorAll('.res-marker').forEach(el=>{el.style.display='none';});
    document.querySelectorAll('.mtrw-resource-marker').forEach(el=>{
      el.style.display=zoom>=14?'':'none';
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