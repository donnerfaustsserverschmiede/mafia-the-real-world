/* MAFIVERA – Map controls + stable feature loaders */
(()=>{'use strict';
let map=null,ready=false;
function positionFromMarker(){if(!map)return null;const el=map.getContainer().querySelector('.player-marker');if(!el)return null;const mr=el.getBoundingClientRect(),cr=map.getContainer().getBoundingClientRect();try{return map.containerPointToLatLng([(mr.left+mr.width/2)-cr.left,(mr.top+mr.height/2)-cr.top])}catch(e){return null}}
function setup(m){if(!m||ready)return;map=m;ready=true;window.__mtrwMap=m;const host=m.getContainer(),z=host.querySelector('.leaflet-control-zoom');if(z){z.classList.add('mtrw-large-zoom');z.style.top='88px';z.style.right='8px';z.style.marginTop='0'}let box=host.querySelector('.mtrw-map-tools');if(!box){box=document.createElement('div');box.className='mtrw-map-tools';box.style.cssText='position:absolute;top:202px;right:8px;z-index:1000;pointer-events:auto';box.innerHTML='<button type="button" class="mtrw-recenter" aria-label="Zu meiner Position zentrieren" title="Meine Position"><span class="mtrw-location-icon" aria-hidden="true"></span></button>';host.appendChild(box)}const b=box.querySelector('button');b.style.cssText='width:56px;height:56px;border:1px solid #394653;border-radius:14px;background:#10151de8;color:#fff;display:grid;place-items:center;box-shadow:0 6px 18px #0008;cursor:pointer;padding:0';const icon=box.querySelector('.mtrw-location-icon');if(icon)icon.style.cssText='position:relative;display:block;width:25px;height:25px;border:3px solid #fff;border-radius:50%;box-sizing:border-box';if(icon&&!icon.querySelector('i')){icon.innerHTML='<i></i>';const i=icon.querySelector('i');i.style.cssText='position:absolute;left:50%;top:50%;width:31px;height:3px;background:#fff;transform:translate(-50%,-50%);border-radius:3px'}b.onclick=()=>recenter();ensureImperiumBadge();setTimeout(()=>m.invalidateSize({pan:false,animate:false}),100)}
function ensureImperiumBadge(){const existing=document.querySelector('.mf-event,#mtrwImperiumBadge');if(existing){existing.style.zIndex='30';existing.style.top='84px';return}const app=document.querySelector('.mf-app');if(!app)return;const b=document.createElement('div');b.id='mtrwImperiumBadge';b.className='mf-event';b.textContent='⚡ MAFIVERA · DEIN IMPERIUM';b.style.cssText='position:absolute;top:84px;left:50%;transform:translateX(-50%);z-index:30';app.appendChild(b)}
function recenter(){const p=positionFromMarker();if(!map||!p){const t=document.getElementById('toast');if(t){t.textContent='GPS-Position noch nicht verfügbar.';t.className='toast show error';setTimeout(()=>t.className='toast',2500)}return}map.setView(p,map.getZoom(),{animate:true})}
installRelationOverlay();
const original=L.map;L.map=function(...args){const m=original.apply(this,args);setTimeout(()=>setup(m),0);return m};window.mtrwRecenter=recenter;

function installRelationOverlay(){
 if(window.__mtrwRelationOverlay)return; window.__mtrwRelationOverlay=true;
 const s=document.createElement('style');s.id='mtrw-relation-overlay-css';s.textContent='.mtrw-live-player b{display:block!important}.mtrw-live-player.mtrw-stranger-player span{background:#ef4444!important}.mtrw-live-player.mtrw-friend-player span{background:#f59e0b!important}.mtrw-live-player.mtrw-ally-player span{background:#22c55e!important}.mtrw-live-player.mtrw-family-player span{background:#a855f7!important}';document.head.appendChild(s);
 const color={stranger:'#ef4444',friend:'#f59e0b',ally:'#22c55e',family:'#a855f7'};
 async function apply(){
  const world=window.__mtrwWorld,rects=window.__mtrwGridRects,db=window.db;if(!world||!rects||!db)return;
  const ids=[...new Set(Object.values(world).map(t=>t?.owner_id).filter(Boolean))];if(!ids.length)return;
  let rel=[];try{const r=await db.rpc('mtrw_user_relations',{p_user_ids:ids});if(!r.error)rel=r.data||[]}catch(e){}
  const mapRel=new Map(rel.map(x=>[x.user_id,x.relation]));
  rects.forEach(rect=>{const owner=world[rect?.__mtrwZone]?.owner_id;});
  Object.entries(world).forEach(([zone,t])=>{if(!t?.owner_id)return;const relation=mapRel.get(t.owner_id)||'stranger';const col=t.owner_id===window.__mtrwUserId?'#2f91ff':(color[relation]||color.stranger);const rect=rects.find(x=>x?.__mtrwZone===zone);if(rect){rect.setStyle({color:col,fillColor:col,fillOpacity:.28,weight:2});}});
 }
 window.mtrwApplyRelationColors=apply;setInterval(apply,1500);setTimeout(apply,500);setTimeout(apply,3000);
}

function load(src,attr,onload){if(document.querySelector(`script[data-mtrw-loader="${attr}"]`)){onload?.();return}const s=document.createElement('script');s.src=src;s.dataset.mtrwLoader=attr;if(onload)s.onload=onload;document.body.appendChild(s)}
load('./mafivera-map-visual-fix.js?v=20260917c','visual-fix');load('./mafivera-map-cleanup.js?v=MAFIVERA-MAP-CLEANUP-20260921-01','map-cleanup');load('./mafivera-v1-stability-fix.js?v=20260917a','v1-stability');load('./mafivera-dealer-button-fix.js?v=20260917a','dealer-button');load('./mafivera-global-chat.js?v=20260917b','global-chat');
let productionReady=false;load('./mafivera-production-v3.js?v=20260917a','production-v3',()=>{productionReady=true});
document.addEventListener('click',e=>{const t=e.target.closest?.('[data-market="production"]');if(!t)return;e.preventDefault();e.stopImmediatePropagation();if(window.mtrwOpenProductionV3)return window.mtrwOpenProductionV3();if(!productionReady){load('./mafivera-production-v3.js?v=20260917a','production-v3',()=>window.mtrwOpenProductionV3?.())}},true);
})();
