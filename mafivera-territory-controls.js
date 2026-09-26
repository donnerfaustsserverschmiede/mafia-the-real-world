/* MAFIVERA V2 — territory controls */
(()=>{'use strict';
let busy=false;
const toast=(text,error=false)=>{const x=document.getElementById('toast');if(!x)return;x.textContent=text;x.className='toast show '+(error?'error':'');clearTimeout(toast.t);toast.t=setTimeout(()=>x.className='toast',2800)};
const db=()=>window.db;
async function rpc(name,args){const d=db();if(!d)throw Error('Datenbank noch nicht bereit.');const r=await d.rpc(name,args);if(r.error)throw r.error;return r.data}
function isHeist(zone){return !!zone&&window.__mtrwHeistZones instanceof Set&&window.__mtrwHeistZones.has(zone)}
function protectHeistClaim(){
 const body=document.getElementById('drawerBody');if(!body)return;
 const buttons=[...body.querySelectorAll('[data-action="claim"]')];
 for(const b of buttons){
   const zone=(b.dataset.zone||'').split('|')[0];
   if(isHeist(zone)){
     b.disabled=true;b.textContent='💀 Heist-Eventfeld · nicht einnehmbar';b.style.opacity='.7';b.style.cursor='not-allowed';b.onclick=()=>toast('Dieses Feld ist ein Heist-Eventfeld und kann nicht von Spielern besessen werden.',true);
   }
 }
}
async function claim(zone,button){
 if(isHeist(zone)){toast('Dieses Feld ist ein Heist-Eventfeld und kann nicht von Spielern besessen werden.',true);return}
 if(busy)return;busy=true;button.disabled=true;const old=button.textContent;button.textContent='⏳ Prüfe Standort…';
 const send=(lat,lng)=>rpc('mafivera_claim',{p_zone_key:zone,p_lat:lat,p_lng:lng,p_count:1});
 try{let result;
   if(navigator.geolocation)result=await new Promise((resolve,reject)=>navigator.geolocation.getCurrentPosition(p=>send(p.coords.latitude,p.coords.longitude).then(resolve).catch(reject),()=>send(null,null).then(resolve).catch(reject),{enableHighAccuracy:true,maximumAge:10000,timeout:5000}));
   else result=await send(null,null);
   toast(result?.remote?'Gebiet übernommen. Schläger stationiert.':'Gebiet übernommen.');setTimeout(()=>location.reload(),350)
 }catch(e){
   const code=String(e?.message||'').replace(/^Error:\s*/i,'');
   const msg=code==='heist_event_field'?'Dieses Feld ist ein Heist-Eventfeld und kann nicht von Spielern besessen werden.':code==='not_enough_hitmen'?'Nicht genügend Schläger.':code==='must_be_adjacent'?'Das Feld muss an dein eigenes Gebiet angrenzen.':code==='insufficient_money'?'Nicht genügend Geld.':code||'Gebiet konnte nicht beansprucht werden.';
   toast(msg,true);button.disabled=false;button.textContent=old
 }finally{busy=false}
}
function wireClaim(){
 const body=document.getElementById('drawerBody');const original=body?.querySelector('[data-action="claim"]');
 if(!original||original.dataset.remoteClaimWired)return;if(!original.dataset.zone)return;
 const button=original.cloneNode(true);button.dataset.remoteClaimWired='1';original.replaceWith(button);
 button.onclick=()=>claim((button.dataset.zone||'').split('|')[0],button);protectHeistClaim()
}
async function demolish(zone){if(busy)return;busy=true;try{if(!confirm('Gebäude wirklich abreißen? Du erhältst 50 % der bisher investierten Baukosten zurück.'))return;const r=await rpc('mafivera_demolish',{p_zone_key:zone});toast(`Gebäude abgerissen. Erstattung: ${Number(r?.refund||0).toLocaleString('de-DE')} $`);setTimeout(()=>location.reload(),350)}catch(e){toast(e.message||'Gebäude konnte nicht abgerissen werden.',true)}finally{busy=false}}
async function leave(zone){if(busy)return;busy=true;try{if(!confirm('Gebiet wirklich verlassen? Nur dadurch gibst du den Besitz auf. Gebäude gehen verloren und stationierte Schläger kehren zurück.'))return;const r=await rpc('mafivera_leave_territory',{p_zone_key:zone});const n=Number(r?.returned_hitmen||0);toast(`Gebiet freigegeben.${n?` ${n} Schläger zurückerhalten.`:''}`);setTimeout(()=>location.reload(),350)}catch(e){toast(e.message||'Gebiet konnte nicht freigegeben werden.',true)}finally{busy=false}}
function removeDuplicateTerritoryActions(){const body=document.getElementById('drawerBody');if(!body)return;const buttons=[...body.querySelectorAll('button.action')];const norm=t=>String(t||'').replace(/\s+/g,' ').trim();const demolish=buttons.find(b=>/Gebäude abreißen\s*·\s*50\s*%\s*Erstattung/i.test(norm(b.textContent)));if(demolish){const leave=demolish.nextElementSibling;if(leave&&/Gebiet verlassen/i.test(norm(leave.textContent)))leave.remove();demolish.remove()}}
function enhance(){protectHeistClaim();wireClaim();removeDuplicateTerritoryActions()}
window.mtrwRefreshTerritoryHeistUI=enhance;
window.addEventListener('mtrw-heist-owners-cleared',enhance);
const observer=new MutationObserver(()=>setTimeout(enhance,0));
function boot(){const body=document.getElementById('drawerBody');if(!body){setTimeout(boot,500);return}observer.observe(body,{childList:true,subtree:true});enhance()}
function loadScript(src,key){if(document.querySelector(`script[data-mtrw-live="${key}"]`))return;const x=document.createElement('script');x.src=src;x.dataset.mtrwLive=key;x.async=false;document.body.appendChild(x)}
function loadLiveModules(){const v='20260917-v5';loadScript(`./mafivera-buildings.js?v=${v}`,'buildings');loadScript(`./mafivera-admin.js?v=${v}`,'admin');loadScript(`./mafivera-occupation.js?v=${v}`,'occupation');loadScript(`./mafivera-dealer-v2.js?v=${v}`,'dealer-v2')}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{boot();loadLiveModules()});else{boot();loadLiveModules()}
})();