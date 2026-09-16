/* MAFIVERA V1 — full live map, territory grid and mobile navigation */
(()=>{
  'use strict';
  if(window.__mtrwLiveMapUIv3)return;
  window.__mtrwLiveMapUIv3=true;

  const css=document.createElement('style');
  css.id='mtrw-live-map-ui-v3-css';
  css.textContent=`
  html,body,#gameRoot,.mafivera-game{width:100%!important;height:100%!important;min-width:0!important;min-height:100%!important;overflow:hidden!important}
  .mafivera-game{position:fixed!important;inset:0!important}
  .world-map{position:fixed!important;inset:0!important;width:100vw!important;height:100vh!important;min-width:100%!important;min-height:100%!important;z-index:1!important;background:#0b1118!important}
  .world-map .leaflet-container{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;min-width:100%!important;min-height:100%!important;background:#111820!important;filter:saturate(.72) brightness(.72)!important}
  .world-map .leaflet-map-pane,.world-map .leaflet-tile-pane{width:100%!important;height:100%!important}
  .world-map .leaflet-tile-container{visibility:visible!important;opacity:1!important}
  .world-map .leaflet-tile{opacity:.96!important;filter:brightness(.82) saturate(.8)!important}
  .world-map .leaflet-overlay-pane,.world-map .leaflet-marker-pane,.world-map .leaflet-shadow-pane,.world-map .leaflet-popup-pane{z-index:4!important}
  .world-map .leaflet-tile-pane{z-index:1!important}
  .world-map .leaflet-overlay-pane{z-index:3!important}
  .mtrw-live-grid{position:absolute;inset:0;z-index:2;pointer-events:none;background-image:linear-gradient(rgba(40,105,155,.14) 1px,transparent 1px),linear-gradient(90deg,rgba(40,105,155,.14) 1px,transparent 1px);background-size:64px 64px;mix-blend-mode:screen;opacity:.45}
  .map-overlay.top-right{display:none!important;visibility:hidden!important}
  .world-map .leaflet-control-zoom{display:none!important}
  .bottom-nav{position:fixed!important;left:8px!important;right:8px!important;bottom:max(8px,env(safe-area-inset-bottom))!important;width:auto!important;height:76px!important;transform:none!important;margin:0!important;z-index:1000!important;display:grid!important;grid-template-columns:repeat(6,minmax(0,1fr))!important;gap:3px!important}
  .bottom-nav .bottom-btn{width:100%!important;min-width:0!important;margin:0!important;transform:none!important}
  @media(max-width:520px){.bottom-nav{left:6px!important;right:6px!important;height:70px!important;padding:5px!important}.bottom-nav .bottom-btn{height:58px!important}.bottom-nav .bottom-btn span{font-size:19px!important}.bottom-nav .bottom-btn small{font-size:7px!important}}
  .mtrw-pf-bottom-profile{color:#ff8149!important}
  .mtrw-pf-bottom-family{color:#a970ff!important}
  `;
  document.head.appendChild(css);

  const removeTopRight=()=>{
    document.querySelectorAll('.map-overlay.top-right').forEach(e=>e.remove());
    document.querySelectorAll('.world-map .leaflet-control-zoom').forEach(e=>e.remove());
  };

  const addGridOverlay=()=>{
    const mapHost=document.querySelector('.world-map');
    if(mapHost&&!mapHost.querySelector('.mtrw-live-grid')){
      const g=document.createElement('div');g.className='mtrw-live-grid';mapHost.appendChild(g);
    }
  };

  const fixMap=()=>{
    const host=document.querySelector('.world-map');
    const map=window.__mtrwLeafletMap;
    if(!host)return false;
    host.style.setProperty('position','fixed','important');
    host.style.setProperty('inset','0','important');
    host.style.setProperty('width','100vw','important');
    host.style.setProperty('height','100vh','important');
    const container=host.querySelector('.leaflet-container');
    if(container){
      container.style.setProperty('position','absolute','important');
      container.style.setProperty('inset','0','important');
      container.style.setProperty('width','100%','important');
      container.style.setProperty('height','100%','important');
    }
    if(map&&window.L){
      try{
        map.invalidateSize(true);
        let osm=null;
        map.eachLayer(layer=>{
          if(layer instanceof L.TileLayer){
            const u=layer._url||'';
            if(u.includes('openstreetmap.org'))osm=layer;
            else map.removeLayer(layer);
          }
        });
        if(!osm){
          osm=L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
            maxZoom:19,minZoom:1,subdomains:['a','b','c'],keepBuffer:8,updateWhenIdle:false,updateWhenZooming:true,attribution:'© OpenStreetMap contributors'
          });
          osm.addTo(map);
        }
        if(map.getZoom()<12)map.setZoom(13,{animate:false});
        map.invalidateSize(true);
        setTimeout(()=>map.invalidateSize(true),250);
        setTimeout(()=>map.invalidateSize(true),1000);
      }catch(e){console.warn('MAFIVERA live map repair',e)}
    }
    addGridOverlay();
    return true;
  };

  const userData=()=>{
    const u=window.__mtrwCurrentUser;
    return {name:u?.user_metadata?.username||u?.email?.split('@')[0]||'Spieler'};
  };

  const openExisting=mode=>{
    if(typeof window.mtrwOpenProfileFamily==='function')return window.mtrwOpenProfileFamily(mode);
    const ev=new CustomEvent('mtrw:open-profile-family',{detail:{mode}});
    window.dispatchEvent(ev);
  };

  const ensureNav=()=>{
    const nav=document.querySelector('.bottom-nav');
    if(!nav)return false;
    let profile=nav.querySelector('[data-mtrw-profile]');
    let family=nav.querySelector('[data-panel="family"], [data-mtrw-family]');
    if(!profile){
      profile=document.createElement('button');
      profile.className='bottom-btn mtrw-pf-bottom-profile';
      profile.dataset.mtrwProfile='1';
      profile.innerHTML='<span>♙</span><small>PROFIL</small>';
      nav.insertBefore(profile,nav.firstChild);
    }
    profile.onclick=e=>{e.preventDefault();e.stopPropagation();openExisting('profile')};
    if(!family){
      family=document.createElement('button');
      family.className='bottom-btn mtrw-pf-bottom-family';
      family.dataset.mtrwFamily='1';
      family.innerHTML='<span>♜</span><small>FAMILIE</small>';
      nav.insertBefore(family,nav.children[1]||null);
    }
    family.onclick=e=>{e.preventDefault();e.stopPropagation();openExisting('family')};
    return true;
  };

  const boot=()=>{removeTopRight();fixMap();ensureNav();};
  const observer=new MutationObserver(()=>boot());
  observer.observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener('resize',()=>setTimeout(boot,50));
  window.addEventListener('orientationchange',()=>setTimeout(boot,300));
  window.addEventListener('mtrw:game-ready',()=>setTimeout(boot,100));
  let n=0;const timer=setInterval(()=>{boot();if(++n>120)clearInterval(timer)},250);
  boot();
})();
