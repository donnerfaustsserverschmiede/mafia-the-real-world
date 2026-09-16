/* MAFIVERA live map/navigation fix */
(()=>{
  'use strict';
  if(window.mtrwLiveMapFix)return;
  window.mtrwLiveMapFix=true;
  const style=document.createElement('style');
  style.textContent=`
    .leaflet-container{background:#18212b!important;filter:brightness(1.08) saturate(.82) contrast(1.12)!important}
    .leaflet-tile{opacity:1!important}
    .leaflet-tile-pane{filter:none!important}
    .bottom-nav{grid-template-columns:repeat(6,1fr)!important;width:auto!important}
  `;
  document.head.appendChild(style);
  const patchTiles=()=>{
    document.querySelectorAll('.leaflet-tile-pane img.leaflet-tile').forEach(img=>{
      const src=img.getAttribute('src')||'';
      const m=src.match(/(?:dark_all|light_all)\/(\d+)\/(\d+)\/(\d+)(?:@2x)?\.png/);
      if(!m||img.dataset.mtrwOsm)return;
      img.dataset.mtrwOsm='1';
      img.src=`https://tile.openstreetmap.org/${m[1]}/${m[2]}/${m[3]}.png`;
    });
  };
  const ensureFamily=()=>{
    const nav=document.querySelector('.bottom-nav');
    if(!nav)return;
    let family=nav.querySelector('[data-panel="family"]');
    if(!family){
      family=document.createElement('button');
      family.className='bottom-btn';
      family.dataset.panel='family';
      family.innerHTML='<span>♜</span><small>FAMILIE</small>';
      const business=nav.querySelector('[data-panel="business"]');
      if(business)nav.insertBefore(family,business);else nav.prepend(family);
    }
    const existing=nav.querySelector('[data-panel="family"]');
    if(existing&&!existing.dataset.mtrwFamilyHook){
      existing.dataset.mtrwFamilyHook='1';
      existing.addEventListener('click',()=>{
        const original=document.querySelector('[data-panel="family"]');
        if(original&&original!==existing)original.click();
      });
    }
    const profile=nav.querySelector('[data-panel="profile"]');
    if(profile)profile.style.display='none';
    nav.style.gridTemplateColumns='repeat(6,1fr)';
  };
  const run=()=>{patchTiles();ensureFamily()};
  const wait=()=>{run();const map=document.getElementById('worldMap');if(map&&!map.dataset.mtrwTileObserver){map.dataset.mtrwTileObserver='1';new MutationObserver(run).observe(map,{subtree:true,childList:true})}};
  const timer=setInterval(()=>{if(document.querySelector('.mafivera-game')){wait();clearInterval(timer)}},250);
})();