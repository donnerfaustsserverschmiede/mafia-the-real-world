/* MAFIVERA — automatic client updater + update reward notification */
(()=>{
  'use strict';
  if(window.__mtrwAutoUpdateLoaded)return;
  window.__mtrwAutoUpdateLoaded=true;

  const CURRENT='6.1.1';
  const VERSION_URL='./version.json';
  let reloading=false, rewardSent=false;

  async function clearClientCaches(){
    try{
      if('serviceWorker' in navigator){
        for(const r of await navigator.serviceWorker.getRegistrations()){
          try{await r.unregister()}catch(_){}
        }
      }
      if('caches' in window){
        for(const k of await caches.keys()){
          try{await caches.delete(k)}catch(_){}
        }
      }
    }catch(_){}
  }

  async function notifyUpdateReward(){
    if(rewardSent||!window.db?.auth)return;
    try{
      const s=await window.db.auth.getSession();
      if(!s?.data?.session)return;
      const r=await window.db.rpc('mtrw_update_notification_tick',{p_version:CURRENT});
      if(!r.error)rewardSent=true;
    }catch(_){}
  }

  async function check(){
    if(reloading)return;
    try{
      const r=await fetch(VERSION_URL+'?mtrw_version='+Date.now(),{cache:'no-store',credentials:'same-origin'});
      if(!r.ok)return;
      const v=await r.json();
      if(v?.version && v.version!==CURRENT){
        const newer=(a,b)=>{
          const pa=String(a).replace(/^v/i,'').split('.').map(x=>parseInt(x,10)||0);
          const pb=String(b).replace(/^v/i,'').split('.').map(x=>parseInt(x,10)||0);
          for(let i=0;i<3;i++){if((pa[i]||0)!==(pb[i]||0))return(pa[i]||0)<(pb[i]||0)}
          return false;
        };
        if(newer(CURRENT,v.version)){
          reloading=true;
          await clearClientCaches();
          location.replace(location.pathname+'?mtrw_auto_update='+Date.now()+location.hash);
        }
      }
    }catch(_){}
  }

  setTimeout(check,8000);
  setInterval(check,30000);
  setInterval(notifyUpdateReward,5000);
  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='visible'){check();notifyUpdateReward()}
  });
  notifyUpdateReward();
})();