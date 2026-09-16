/* MAFIVERA V1 — full live map, territory grid and mobile navigation */
(()=>{
'use strict';
if(window.__mtrwLiveMapUIv3)return;window.__mtrwLiveMapUIv3=true;
const css=document.createElement('style');css.id='mtrw-live-map-ui-v3-css';css.textContent=`
html,body,#gameRoot,.mafivera-game{width:100%!important;height:100%!important;min-width:0!important;min-height:100%!important;overflow:hidden!important}
.mafivera-game{position:fixed!important;inset:0!important}
.world-map{position:fixed!important;inset:0!important;width:100vw!important;height:100vh!important;min-width:100%!important;min-height:100%!important;z-index:1!important;background:#0b1118!important}
.world-map .leaflet-container{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;min-width:100%!important;min-height:100%!important;background:#111820!important;filter:saturate(.72) brightness(.72)!important}
.world-map .leaflet-map-pane,.world-map .leaflet-tile-pane,.world-map .leaflet-overlay-pane,.world-map .leaflet-marker-pane{width:100%!important;height:100%!important}
.world-map .leaflet-tile-container{visibility:visible!important;opacity:1!important}
.world-map .leaflet-tile{opacity:.96!important;filter:brightness(.82) saturate(.8)!important}
.map-overlay.top-right,.world-map .leaflet-control-zoom{display:none!important;visibility:hidden!important}
.bottom-nav{position:fixed!important;left:6px!important;right:6px!important;bottom:max(8px,env(safe-area-inset-bottom))!important;width:auto!important;height:76px!important;transform:none!important;margin:0!important;z-index:1000!important;display:grid!important;grid-template-columns:repeat(7,minmax(0,1fr))!important;gap:3px!important}
.bottom-nav .bottom-btn{width:100%!important;min-width:0!important;margin:0!important;transform:none!important;padding:3px 1px!important}
.bottom-nav .bottom-btn small{white-space:nowrap!important}
.mtrw-pf-bottom-profile{color:#ff8149!important}.mtrw-pf-bottom-family{color:#a970ff!important}
@media(max-width:520px){.bottom-nav{left:5px!important;right:5px!important;height:70px!important;padding:5px!important;grid-template-columns:repeat(7,minmax(0,1fr))!important}.bottom-nav .bottom-btn{height:58px!important}.bottom-nav .bottom-btn span{font-size:18px!important}.bottom-nav .bottom-btn small{font-size:6px!important;letter-spacing:.3px!important}}
`;
document.head.appendChild(css);
const removeTopRight=()=>{document.querySelectorAll('.map-overlay.top-right,.world-map .leaflet-control-zoom').forEach(e=>e.remove())};
const fixMap=()=>{const host=document.querySelector('.world-map'),map=window.__mtrwLeafletMap;if(!host)return false;host.style.setProperty('position','fixed','important');host.style.setProperty('inset','0','important');host.style.setProperty('width','100vw','important');host.style.setProperty('height','100vh','important');const c=host.querySelector('.leaflet-container');if(c){c.style.setProperty('position','absolute','important');c.style.setProperty('inset','0','important');c.style.setProperty('width','100%','important');c.style.setProperty('height','100%','important')}if(map&&window.L){try{map.invalidateSize(true);let osm=null;map.eachLayer(layer=>{if(layer instanceof L.TileLayer){const u=layer._url||'';if(u.includes('openstreetmap.org'))osm=layer;else map.removeLayer(layer)}});if(!osm){osm=L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{minZoom:1,maxZoom:19,subdomains:['a','b','c'],keepBuffer:10,updateWhenIdle:false,updateWhenZooming:true,attribution:'© OpenStreetMap contributors'});osm.addTo(map)}if(map.getZoom()<12)map.setZoom(13,{animate:false});map.invalidateSize(true);setTimeout(()=>map.invalidateSize(true),200);setTimeout(()=>map.invalidateSize(true),800)}catch(e){console.warn('MAFIVERA map repair',e)}}return true};
const openPanel=mode=>{if(mode==='profile'&&typeof window.mtrwOpenProfile==='function')return window.mtrwOpenProfile();if(mode==='family'&&typeof window.mtrwOpenFamily==='function')return window.mtrwOpenFamily();window.dispatchEvent(new CustomEvent('mtrw:open-profile-family',{detail:{mode}}))};
const ensureNav=()=>{const nav=document.querySelector('.bottom-nav');if(!nav)return false;let p=nav.querySelector('[data-panel="profile"]');let f=nav.querySelector('[data-panel="family"]');if(!p){p=document.createElement('button');p.className='bottom-btn mtrw-pf-bottom-profile';p.dataset.panel='profile';p.innerHTML='<span>♙</span><small>PROFIL</small>';nav.appendChild(p)}if(!f){f=document.createElement('button');f.className='bottom-btn mtrw-pf-bottom-family';f.dataset.panel='family';f.innerHTML='<span>♜</span><small>FAMILIE</small>';nav.appendChild(f)}p.classList.add('mtrw-pf-bottom-profile');f.classList.add('mtrw-pf-bottom-family');p.onclick=e=>{e.preventDefault();e.stopPropagation();openPanel('profile')};f.onclick=e=>{e.preventDefault();e.stopPropagation();openPanel('family')};return true};
const boot=()=>{removeTopRight();fixMap();ensureNav()};
new MutationObserver(boot).observe(document.documentElement,{childList:true,subtree:true});
window.addEventListener('resize',()=>setTimeout(boot,80));window.addEventListener('orientationchange',()=>setTimeout(boot,300));window.addEventListener('mtrw:game-ready',()=>setTimeout(boot,100));
let n=0;const timer=setInterval(()=>{boot();if(++n>160)clearInterval(timer)},250);boot();
})();
