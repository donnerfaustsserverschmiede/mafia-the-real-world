/* MAFIVERA V1 runtime patch – production, dealer, map markers, global chat */
(()=>{'use strict';
const esc=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
const load=s=>new Promise((ok,bad)=>{const x=document.createElement('script');x.src=s;x.onload=ok;x.onerror=bad;document.body.appendChild(x)});
function patchProduction(){
 const mark=()=>document.querySelectorAll('[data-market="production"]').forEach(b=>b.dataset.market='production-v2');
 mark(); new MutationObserver(mark).observe(document.body,{subtree:true,childList:true});
 document.addEventListener('click',e=>{const b=e.target.closest?.('[data-market="production-v2"]');if(!b)return;e.preventDefault();e.stopImmediatePropagation();window.mtrwOpenProduction?.()},true);
}
function patchDealer(){
 document.addEventListener('click',e=>{const b=e.target.closest?.('#dealerAlert');if(!b)return;e.preventDefault();e.stopImmediatePropagation();const d=window.__mtrwDealerState;if(d?.lat&&d?.lng&&window.__mtrwMap){window.__mtrwMap.setView([d.lat,d.lng],Math.max(window.__mtrwMap.getZoom(),16),{animate:true});window.mtrwToast?.('Dealer auf der Karte markiert.')}},true);
}
function patchMarkers(){
 const s=document.createElement('style');s.textContent=`
 .mf-map .res-marker{width:30px!important;height:30px!important;background:transparent!important;border:0!important;display:grid!important;place-items:center!important;overflow:visible!important}
 .mf-map .res-marker span{width:28px!important;height:28px!important;display:grid!important;place-items:center!important;line-height:28px!important;background:#10151deb!important;border:1px solid #39424e!important;border-radius:7px!important;font-size:15px!important;font-family:system-ui,sans-serif!important;transform:none!important;position:static!important}
 .mf-map .res-marker .money{color:#f0c34c!important}.mf-map .res-marker .material{color:#52dfb0!important}.mf-map .res-marker .reputation{color:#e9b8ff!important}
 .mf-map .building-marker{width:100px!important;height:54px!important;display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;overflow:visible!important}
 .mf-map .building-marker span{font-size:26px!important;line-height:28px!important;display:block!important;transform:none!important}
 .mf-map .building-marker b{font-size:8px!important;line-height:13px!important;padding:1px 5px!important;display:block!important;transform:none!important}
 .mf-map .near-player-marker,.mf-map .dealer-marker{width:90px!important;height:50px!important;display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;overflow:visible!important}
 .mf-map .near-player-marker span,.mf-map .dealer-marker span{font-size:25px!important;line-height:27px!important;display:block!important}
 .mf-map .near-player-marker b,.mf-map .dealer-marker b{font-size:8px!important;line-height:13px!important;padding:1px 5px!important;display:block!important}
 `;document.head.appendChild(s);
}
function patchDealerState(){
 const old=window.__mtrwDealerState;
 if(old)return;
 // dealer-ui/market writes its state internally; mirror it from the RPC every few seconds for the location button.
 const t=setInterval(async()=>{try{if(!window.db)return;const r=await window.db.rpc('mtrw_dealer_state');if(!r.error)window.__mtrwDealerState=r.data||null}catch(e){}},2500);window.__mtrwDealerPatchTimer=t;
}
patchProduction();patchDealer();patchMarkers();patchDealerState();
setTimeout(()=>load('./mafivera-global-chat.js?v=20260917v').catch(()=>{}),700);
})();