/* MAFIVERA interaction/boot repair — keep map tiles and mailbox tappable */
(()=>{
  'use strict';
  if(window.__mtrwInteractionRepair)return;
  window.__mtrwInteractionRepair=true;
  const repairCache=async()=>{
    try{
      if('serviceWorker' in navigator){
        for(const r of await navigator.serviceWorker.getRegistrations()){
          try{await r.unregister()}catch(_){}
        }
      }
      if('caches' in window){
        for(const k of await caches.keys()){
          try{await caches.delete(k)}catch(_){}
        }
      }
    }catch(_){}
  };
  const run=()=>{
    const map=window.__mtrwMap;
    if(map){
      const el=map.getContainer?.();
      if(el){
        el.style.pointerEvents='auto';
        el.style.touchAction='pan-x pan-y';
        const overlay=el.querySelector('.leaflet-overlay-pane');
        if(overlay)overlay.style.pointerEvents='auto';
      }
      if(!map.__mtrwTapRepair){
        map.__mtrwTapRepair=true;
        map.on('click',e=>{
          try{
            if(!e?.latlng)return;
            const target=e.originalEvent?.target;
            if(target?.closest?.('.leaflet-interactive'))return;
            let hit=null;
            map.eachLayer(layer=>{
              if(hit||typeof layer.getBounds!=='function')return;
              try{if(layer.__mtrwZone&&layer.getBounds().contains(e.latlng))hit=layer}catch(_){}
            });
            if(hit)hit.fire('click',{latlng:e.latlng,originalEvent:e.originalEvent});
          }catch(err){console.warn('MAFIVERA tile tap repair:',err)}
        });
      }
    }
    const mb=document.getElementById('mtrwMailbox');
    if(mb){
      mb.style.pointerEvents='auto';
      const btn=document.getElementById('mtrwMailboxBtn');
      const panel=document.getElementById('mtrwMailboxPanel');
      if(btn)btn.style.pointerEvents='auto';
      if(panel)panel.style.pointerEvents='auto';
    }
  };
  const bootGuard=()=>{
    if(sessionStorage.getItem('mtrw_boot_repair_done')==='1')return;
    if(window.__mtrwGameBooted&&!document.querySelector('.mf-app')){
      sessionStorage.setItem('mtrw_boot_repair_done','1');
      repairCache().finally(()=>location.replace(location.pathname+'?mtrw_boot_repair='+Date.now()+location.hash));
    }
  };
  setTimeout(bootGuard,6500);
  setInterval(run,1000);
  run();
})();