/* MAFIVERA — automatic client version synchronisation
   The Pages build stamps index.html with the Git commit SHA.
   Every already-open client checks that stamp and reloads itself when a new build is live. */
(()=>{
  'use strict';
  if(window.__mtrwAutoUpdateLoaded)return;
  window.__mtrwAutoUpdateLoaded=true;

  const current=()=>String(window.__MTRW_BUILD||'').trim();
  let reloading=false;

  async function clearClientCaches(){
    try{
      if('serviceWorker' in navigator){
        for(const r of await navigator.serviceWorker.getRegistrations()) await r.unregister();
      }
      if('caches' in window){
        for(const k of await caches.keys()) await caches.delete(k);
      }
    }catch(e){}
  }

  async function check(){
    if(reloading || !current()) return;
    try{
      const url='./index.html?mtrw_version_check='+Date.now();
      const r=await fetch(url,{cache:'no-store',credentials:'same-origin'});
      if(!r.ok)return;
      const html=await r.text();
      const m=html.match(/window\.__MTRW_BUILD=['\"]([^'\"]+)['\"]/);
      const latest=m?.[1]?.trim();
      if(!latest || latest===current())return;

      reloading=true;
      try{sessionStorage.setItem('mtrw_update_notice','1')}catch(e){}
      await clearClientCaches();
      const clean=location.href.replace(/[?&]mtrw_reload=1/g,'').replace(/[?&]mtrw_version_check=[^&]*/g,'');
      location.replace(clean+(clean.includes('?')?'&':'?')+'mtrw_reload=1');
    }catch(e){}
  }

  setTimeout(check,5000);
  setInterval(check,30000);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')check()});
})();
