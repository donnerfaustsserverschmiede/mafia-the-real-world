/* MAFIVERA – Map controls: larger zoom buttons + reliable player recenter */
(()=>{'use strict';
let map=null,ready=false;
function positionFromMarker(){
  if(!map)return null;
  const el=map.getContainer().querySelector('.player-marker');
  if(!el)return null;
  const mr=el.getBoundingClientRect(),cr=map.getContainer().getBoundingClientRect();
  const x=(mr.left+mr.width/2)-cr.left,y=(mr.top+mr.height/2)-cr.top;
  try{return map.containerPointToLatLng([x,y])}catch(e){return null}
}
function loadVisualFix(){if(document.querySelector('script[data-mtrw-map-visual-fix]'))return;const s=document.createElement('script');s.src='./mafivera-map-visual-fix.js?v=20260917u';s.dataset.mtrwMapVisualFix='1';document.body.appendChild(s)}
function setup(m){
  if(!m||ready)return;
  map=m;ready=true;window.__mtrwMap=m;
  loadVisualFix();
  const host=m.getContainer();
  const z=host.querySelector('.leaflet-control-zoom');
  if(z){z.classList.add('mtrw-large-zoom');z.style.top='8px';z.style.right='8px';z.style.marginTop='0'}
  let box=host.querySelector('.mtrw-map-tools');
  if(!box){
    box=document.createElement('div');box.className='mtrw-map-tools';
    box.style.cssText='position:absolute;top:76px;right:8px;z-index:1000;pointer-events:auto';
    box.innerHTML='<button type="button" class="mtrw-recenter" aria-label="Zu meiner Position zentrieren" title="Meine Position"><span class="mtrw-location-icon" aria-hidden="true"></span></button>';
    host.appendChild(box);
  }
  const b=box.querySelector('button');
  b.style.cssText='width:56px;height:56px;border:1px solid #394653;border-radius:14px;background:#10151de8;color:#fff;display:grid;place-items:center;box-shadow:0 6px 18px #0008;cursor:pointer;padding:0';
  const icon=box.querySelector('.mtrw-location-icon');
  if(icon)icon.style.cssText='position:relative;display:block;width:25px;height:25px;border:3px solid #fff;border-radius:50%;box-sizing:border-box';
  if(icon&&!icon.querySelector('i')){icon.innerHTML='<i></i>';const i=icon.querySelector('i');i.style.cssText='position:absolute;left:50%;top:50%;width:31px;height:3px;background:#fff;transform:translate(-50%,-50%);border-radius:3px'}
  b.onclick=()=>recenter();
  ensureImperiumBadge();
}
function ensureImperiumBadge(){
  const existing=document.querySelector('.mf-event,#mtrwImperiumBadge');
  if(existing){existing.style.zIndex='30';existing.style.top='84px';return}
  const app=document.querySelector('.mf-app');if(!app)return;
  const b=document.createElement('div');b.id='mtrwImperiumBadge';b.className='mf-event';b.textContent='⚡ MAFIVERA · DEIN IMPERIUM';
  b.style.cssText='position:absolute;top:84px;left:50%;transform:translateX(-50%);z-index:30';
  app.appendChild(b);
}
function recenter(){
  const p=positionFromMarker();
  if(!map||!p){const t=document.getElementById('toast');if(t){t.textContent='GPS-Position noch nicht verfügbar.';t.className='toast show error';setTimeout(()=>t.className='toast',2500)}return}
  map.setView(p,map.getZoom(),{animate:true});
}
const original=L.map;
L.map=function(...args){const m=original.apply(this,args);setTimeout(()=>setup(m),0);return m};
window.mtrwRecenter=recenter;
const loadProductionV2=()=>{if(window.mtrwOpenProduction||document.querySelector('script[data-mtrw-production-v2]'))return;const s=document.createElement('script');s.src='./mafivera-production-v2.js?v=20260917t';s.dataset.mtrwProductionV2='1';document.body.appendChild(s)};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',loadProductionV2);else loadProductionV2();
})();