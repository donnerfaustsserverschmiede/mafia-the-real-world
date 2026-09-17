/* MAFIVERA – Map controls: larger zoom buttons + recenter on player */
(()=>{'use strict';
let map=null,ready=false;
function setup(m){if(!m||ready)return;map=m;ready=true;const host=m.getContainer(),z=host.querySelector('.leaflet-control-zoom');if(z){z.classList.add('mtrw-large-zoom');z.style.top='92px';z.style.right='10px';z.style.marginTop='0'}const box=document.createElement('div');box.className='mtrw-map-tools';box.innerHTML='<button type="button" class="mtrw-recenter" aria-label="Zu meiner Position zentrieren" title="Meine Position">⌖</button>';host.appendChild(box);box.querySelector('button').onclick=()=>recenter()}
const original=L.map;L.map=function(...args){const m=original.apply(this,args);setTimeout(()=>setup(m),0);return m};
function position(){const p=window.__mtrwProfile||window.profile||{};const lat=Number(p.gps_lat),lng=Number(p.gps_lng);return Number.isFinite(lat)&&Number.isFinite(lng)?[lat,lng]:null}
function recenter(){const p=position();if(!map||!p){const t=document.getElementById('toast');if(t){t.textContent='GPS-Position noch nicht verfügbar.';t.className='toast show error';setTimeout(()=>t.className='toast',2500)}return}map.setView(p,map.getZoom(),{animate:true})}
window.mtrwRecenter=recenter;
})();
