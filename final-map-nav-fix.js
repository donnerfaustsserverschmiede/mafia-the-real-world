/* MAFIVERA V1 — final map/nav stabilization */
(()=>{'use strict';
if(window.__mtrwFinalReliableBootstrap)return;window.__mtrwFinalReliableBootstrap=true;
const css=document.createElement('style');css.textContent=`
#gameRoot,.mafivera-game{position:fixed!important;inset:0!important;width:100%!important;height:100%!important;min-height:0!important;overflow:hidden!important}
.mafivera-game .world-map{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;min-height:0!important;overflow:hidden!important;z-index:1!important}
.mafivera-game .world-map .leaflet-container{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;min-height:0!important;z-index:1!important;touch-action:none!important}
.mafivera-game .leaflet-tile-pane,.mafivera-game .leaflet-overlay-pane,.mafivera-game .leaflet-marker-pane,.mafivera-game .leaflet-shadow-pane,.mafivera-game .leaflet-popup-pane{z-index:auto!important}
.mafivera-game .hud{position:fixed!important;inset:0 0 auto 0!important;height:88px!important;z-index:200!important;pointer-events:none!important}
.mafivera-game .hud button,.mafivera-game .hud a{pointer-events:auto!important}
.mafivera-game .bottom-nav{display:none!important}
.mtrw-final-menu{position:fixed;top:0;left:0;bottom:0;width:min(320px,84vw);z-index:5000;padding:82px 16px 24px;overflow:auto;transform:translateX(-105%);transition:transform .22s ease;background:linear-gradient(180deg,rgba(5,10,17,.99),rgba(2,6,11,.99));border-right:1px solid rgba(120,155,190,.25);box-shadow:20px 0 70px #000c}
.mtrw-final-menu.open{transform:translateX(0)}
.mtrw-final-menu-back{position:fixed;inset:0;z-index:4999;background:rgba(0,0,0,.5);opacity:0;pointer-events:none;transition:opacity .2s}.mtrw-final-menu-back.open{opacity:1;pointer-events:auto}
.mtrw-final-title{color:#ff7a32;font-size:11px;letter-spacing:3px;font-weight:900;margin:0 7px 15px}.mtrw-final-btn{width:100%;height:55px;margin:0 0 8px;padding:0 14px;border:1px solid rgba(120,155,190,.18);border-radius:14px;background:#10161f;color:#e5ebf2;display:flex;align-items:center;gap:13px;text-align:left;font-size:14px;font-weight:800;cursor:pointer}.mtrw-final-btn span{width:28px;text-align:center;font-size:21px}.mtrw-final-btn small{display:block;margin-top:2px;color:#7f8a99;font-size:8px;letter-spacing:1.3px}.mtrw-final-btn.active{border-color:#ff7a3266;background:#ff7a3214;color:#ff9a62}
`;
document.head.appendChild(css);
const wait=fn=>{let n=0;const t=setInterval(()=>{if(fn()||++n>120)clearInterval(t)},100)};
const findPanel=k=>[...document.querySelectorAll('.bottom-nav .bottom-btn')].find(b=>String(b.dataset.panel||'').toLowerCase()===k);
const openPanel=k=>{const b=findPanel(k)||document.querySelector(`[data-mtrw-repair="${k}"]`);if(b){b.click();return true}return false};
let menu,back;
const close=()=>{menu?.classList.remove('open');back?.classList.remove('open')};
const buildMenu=()=>{
 if(menu)return true;
 const btn=document.getElementById('menuBtn');if(!btn)return false;
 menu=document.createElement('aside');menu.className='mtrw-final-menu';menu.innerHTML='<div class="mtrw-final-title">MAFIVERA · MENÜ</div>';
 back=document.createElement('div');back.className='mtrw-final-menu-back';back.onclick=close;
 const items=[['map','🗺️','KARTE'],['family','♜','FAMILIE'],['business','💼','GESCHÄFTE'],['hitmen','🥷','SCHLÄGER'],['social','♣','SOZIAL'],['more','▦','MEHR'],['profile','◉','PROFIL']];
 items.forEach(([key,icon,label])=>{const b=document.createElement('button');b.type='button';b.className='mtrw-final-btn';b.innerHTML=`<span>${icon}</span><div>${label}<small>ÖFFNEN</small></div>`;b.onclick=()=>{if(key==='map'){close();window.__mtrwLeafletMap?.invalidateSize(true);return}openPanel(key);close()};menu.appendChild(b)});
 document.body.append(back,menu);
 btn.onclick=e=>{e.preventDefault();e.stopPropagation();menu.classList.contains('open')?close():(menu.classList.add('open'),back.classList.add('open'))};
 return true;
};
const fixMap=()=>{const map=window.__mtrwLeafletMap||window.__mtrwMapV4;if(!map)return false;const host=document.querySelector('.world-map');if(host){host.style.setProperty('width','100%','important');host.style.setProperty('height','100%','important')}setTimeout(()=>{try{map.invalidateSize(true);const layers=[];map.eachLayer(l=>{if(l instanceof L.TileLayer)layers.push(l)});if(!layers.length){L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,keepBuffer:6,attribution:'© OpenStreetMap contributors'}).addTo(map)}else layers.forEach(l=>{try{l.setOpacity(1)}catch(e){}})}catch(e){console.warn('MAFIVERA map stabilization',e)}},50);return true};
const boot=()=>{buildMenu();fixMap();return !!menu};
new MutationObserver(boot).observe(document.documentElement,{childList:true,subtree:true});
wait(boot);window.addEventListener('resize',()=>setTimeout(fixMap,100));window.addEventListener('orientationchange',()=>setTimeout(fixMap,300));
})();
