/* MAFIVERA – Map controls: larger zoom buttons + recenter on player */
(()=>{'use strict';
let map=null,ready=false;
function setup(m){if(!m||ready)return;map=m;ready=true;const host=m.getContainer(),z=host.querySelector('.leaflet-control-zoom');if(z){z.classList.add('mtrw-large-zoom');z.style.top='92px';z.style.right='10px';z.style.marginTop='0'}const box=document.createElement('div');box.className='mtrw-map-tools';box.style.cssText='position:absolute;top:202px;right:10px;z-index:1000;pointer-events:auto';box.innerHTML='<button type="button" class="mtrw-recenter" aria-label="Zu meiner Position zentrieren" title="Meine Position">⌖</button>';const b=box.querySelector('button');b.style.cssText='width:56px;height:56px;border:1px solid #394653;border-radius:14px;background:#10151de8;color:#fff;font-size:30px;line-height:1;display:grid;place-items:center;box-shadow:0 6px 18px #0008;cursor:pointer';host.appendChild(box);b.onclick=()=>recenter()}
const original=L.map;L.map=function(...args){const m=original.apply(this,args);setTimeout(()=>setup(m),0);return m};
function position(){const p=window.__mtrwProfile||window.profile||{};const lat=Number(p.gps_lat),lng=Number(p.gps_lng);return Number.isFinite(lat)&&Number.isFinite(lng)?[lat,lng]:null}
function recenter(){const p=position();if(!map||!p){const t=document.getElementById('toast');if(t){t.textContent='GPS-Position noch nicht verfügbar.';t.className='toast show error';setTimeout(()=>t.className='toast',2500)}return}map.setView(p,map.getZoom(),{animate:true})}
window.mtrwRecenter=recenter;
})();
