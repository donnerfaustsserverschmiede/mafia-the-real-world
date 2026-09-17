/* MAFIVERA V1 runtime patch – production, dealer, map markers, chat layout */
(()=>{'use strict';
function patchProduction(){
 const mark=()=>document.querySelectorAll('[data-market="production"]').forEach(b=>b.dataset.market='production-v2');
 mark();new MutationObserver(mark).observe(document.body,{subtree:true,childList:true});
 document.addEventListener('click',e=>{const b=e.target.closest?.('[data-market="production-v2"]');if(!b)return;e.preventDefault();e.stopImmediatePropagation();window.mtrwOpenProduction?.()},true);
 const repair=()=>{const body=document.getElementById('drawerBody');if(body&&/Invalid Date|undefined×|undefined\s*×/i.test(body.textContent||''))window.mtrwOpenProduction?.()};
 new MutationObserver(repair).observe(document.body,{subtree:true,childList:true,characterData:true});repair();
}
function dealerLocation(){
 document.addEventListener('click',e=>{const b=e.target.closest?.('#dealerAlert');if(!b)return;e.preventDefault();e.stopImmediatePropagation();const d=window.__mtrwDealerState;if(d?.lat&&d?.lng&&window.__mtrwMap){window.__mtrwMap.setView([d.lat,d.lng],Math.max(window.__mtrwMap.getZoom(),16),{animate:true});window.mtrwToast?.('Dealer auf der Karte zentriert.')}},true);
}
function patchMarkers(){
 const s=document.createElement('style');s.textContent=`
 .mf-map .res-marker{width:30px!important;height:30px!important;background:transparent!important;border:0!important;display:grid!important;place-items:center!important;overflow:visible!important}
 .mf-map .res-marker span{box-sizing:border-box!important;width:28px!important;height:28px!important;display:grid!important;place-items:center!important;line-height:28px!important;background:#10151deb!important;border:1px solid #39424e!important;border-radius:7px!important;font-size:15px!important;font-weight:900!important;font-family:system-ui,-apple-system,Segoe UI,sans-serif!important;transform:none!important;position:static!important;text-shadow:0 1px 2px #000!important}
 .mf-map .res-marker span.money{color:#f0c34c!important}.mf-map .res-marker span.material{color:#52dfb0!important}.mf-map .res-marker span.reputation{color:#e9b8ff!important}
 .mf-map .building-marker,.mf-map .dealer-marker,.mf-map .near-player-marker{background:transparent!important;border:0!important;overflow:visible!important;text-align:center!important}
 .mf-map .building-marker{width:100px!important;height:54px!important;display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important}
 .mf-map .building-marker span{font-size:26px!important;line-height:28px!important;display:block!important;transform:none!important}
 .mf-map .building-marker b{font-size:8px!important;line-height:13px!important;padding:1px 5px!important;display:block!important;transform:none!important;white-space:nowrap!important}
 .mf-map .dealer-marker,.mf-map .near-player-marker{width:90px!important;height:50px!important;display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important}
 .mf-map .dealer-marker span,.mf-map .near-player-marker span{font-size:25px!important;line-height:27px!important;display:block!important}
 .mf-map .dealer-marker b,.mf-map .near-player-marker b{font-size:8px!important;line-height:13px!important;padding:1px 5px!important;display:block!important;white-space:nowrap!important}
 #dealerAlert{cursor:pointer!important}
 `;document.head.appendChild(s);
}
function patchDealerState(){setInterval(async()=>{try{if(!window.db)return;const r=await window.db.rpc('mtrw_dealer_state');if(!r.error)window.__mtrwDealerState=r.data||null}catch(e){}},2000)}
function repairMapMarkers(){
 let lastRepair=0;
 const check=()=>{
  const map=window.__mtrwMap;
  if(!map)return;
  let resources=0,buildings=0;
  map.eachLayer(layer=>{const cls=layer?.options?.icon?.options?.className||'';if(cls.includes('res-marker'))resources++;if(cls.includes('building-marker'))buildings++});
  if(resources===0 || buildings===0){const now=Date.now();if(now-lastRepair<1500)return;lastRepair=now;map.fire('moveend')}
 };
 setInterval(check,2000);setTimeout(check,1200);
}
function loadChatLayout(){
 if(window.__mtrwChatLayoutLoader)return;window.__mtrwChatLayoutLoader=true;
 const l=()=>{if(document.querySelector('script[data-mtrw-chat-layout]'))return;const x=document.createElement('script');x.src='./mafivera-chat-layout.js?v=20260917a';x.dataset.mtrwChatLayout='1';x.async=false;document.body.appendChild(x)};
 l();
}
patchProduction();dealerLocation();patchMarkers();patchDealerState();repairMapMarkers();loadChatLayout();
})();
