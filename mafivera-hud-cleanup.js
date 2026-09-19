/* MAFIVERA HUD cleanup: Drogen is an inventory item, not a resource. */
(()=>{'use strict';
function clean(){
  const hud=document.querySelector('.mf-hud');
  if(!hud)return false;
  hud.querySelector('.mf-stat.drugs')?.remove();
  hud.style.gridTemplateColumns='repeat(5,minmax(0,1fr))';
  const d=document.getElementById('hudDrugs'); d?.closest('.mf-stat')?.remove();
  return true;
}
if(!clean()){
  const o=new MutationObserver(()=>{if(clean())o.disconnect()});
  o.observe(document.documentElement,{childList:true,subtree:true});
  setTimeout(()=>o.disconnect(),10000);
}
})();