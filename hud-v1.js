/* MAFIVERA V1 — HUD resource display */
(()=>{'use strict';
if(window.mtrwHudV1Installed)return;
window.mtrwHudV1Installed=true;
const css=document.createElement('style');
css.textContent=`
.hud-stats{align-items:stretch!important;gap:6px!important}
.hud-stats span.hud-stat{min-width:68px!important;padding:5px 8px!important;display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;gap:1px!important}
.hud-stats span.hud-stat small{display:block!important;color:#8d98a8!important;font-size:7px!important;font-weight:900!important;letter-spacing:1.2px!important;line-height:1!important}
.hud-stats span.hud-stat b{display:block!important;font-size:13px!important;line-height:1.1!important;color:#f4f7fb!important}
.hud-stats span.hud-stat i{display:none!important;font-style:normal!important}
.hud-stats span.hud-drugs{border-color:rgba(180,104,255,.28)!important;box-shadow:inset 0 0 16px rgba(168,102,255,.045)!important}
.hud-stats span.hud-drugs small{color:#b889ff!important}
.hud-stats span.hud-drugs b{color:#d7b8ff!important}
.hud-stats span.hud-reputation{border-color:rgba(255,207,72,.28)!important;box-shadow:inset 0 0 16px rgba(255,207,72,.045)!important}
.hud-stats span.hud-reputation small{color:#ffd45a!important}
.hud-stats span.hud-reputation b{color:#ffe7a0!important}
@media(max-width:480px){.hud-stats{gap:3px!important}.hud-stats span.hud-stat{min-width:54px!important;padding:4px 5px!important}.hud-stats span.hud-stat small{font-size:6px!important;letter-spacing:.8px!important}.hud-stats span.hud-stat b{font-size:10px!important}}
`;
document.head.appendChild(css);
const setup=()=>{const stats=document.querySelector('.hud-stats'),product=document.getElementById('product'),material=document.getElementById('material');if(!stats||!product||!material)return false;const prepare=(el,label,cls)=>{const box=el?.closest('span');if(!box)return;box.classList.add('hud-stat',cls||'');if(!box.querySelector('.hud-stat-label')){const small=document.createElement('small');small.className='hud-stat-label';small.textContent=label;box.insertBefore(small,el)}};prepare(document.getElementById('money'),'GELD','hud-money');prepare(material,'MATERIAL','hud-material');prepare(product,'DROGEN','hud-drugs');prepare(document.getElementById('level'),'LEVEL','hud-level');if(!document.getElementById('reputation')){const box=document.createElement('span');box.className='hud-stat hud-reputation';box.innerHTML='<small class="hud-stat-label">RUHMPUNKTE</small><b id="reputation">0</b>';stats.appendChild(box)}return true};
let tries=0;const timer=setInterval(()=>{if(setup()||++tries>120){clearInterval(timer);if(!window.mtrwPassiveResourcesV1){const s=document.createElement('script');s.src='./passive-resources-v1.js?v=1';s.async=false;document.body.appendChild(s)}}},250);
})();