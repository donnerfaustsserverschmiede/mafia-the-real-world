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
function setup(m){
  if(!m||ready)return;
  map=m;ready=true;window.__mtrwMap=m;
  const host=m.getContainer();
  const z=host.querySelector('.leaflet-control-zoom');
  if(z){z.classList.add('mtrw-large-zoom');z.style.top='88px';z.style.right='8px';z.style.marginTop='0'}
  let box=host.querySelector('.mtrw-map-tools');
  if(!box){
    box=document.createElement('div');box.className='mtrw-map-tools';
    box.style.cssText='position:absolute;top:202px;right:8px;z-index:1000;pointer-events:auto';
    box.innerHTML='<button type="button" class="mtrw-recenter" aria-label="Zu meiner Position zentrieren" title="Meine Position">⌖</button>';
    host.appendChild(box);
  }
  const b=box.querySelector('button');
  b.style.cssText='width:56px;height:56px;border:1px solid #394653;border-radius:14px;background:#10151de8;color:#fff;font-size:30px;line-height:1;display:grid;place-items:center;box-shadow:0 6px 18px #0008;cursor:pointer';
  b.onclick=()=>recenter();
  ensureImperiumBadge();
}
function ensureImperiumBadge(){
  if(document.querySelector('.mf-event,#mtrwImperiumBadge'))return;
  const app=document.querySelector('.mf-app');if(!app)return;
  const b=document.createElement('div');b.id='mtrwImperiumBadge';b.className='mf-event';b.textContent='⚡ MAFIVERA · DEIN IMPERIUM';app.appendChild(b);
}
function recenter(){
  const p=positionFromMarker();
  if(!map||!p){const t=document.getElementById('toast');if(t){t.textContent='GPS-Position noch nicht verfügbar.';t.className='toast show error';setTimeout(()=>t.className='toast',2500)}return}
  map.setView(p,map.getZoom(),{animate:true});
}
const original=L.map;
L.map=function(...args){const m=original.apply(this,args);setTimeout(()=>setup(m),0);return m};
window.mtrwRecenter=recenter;
})();