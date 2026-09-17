/* MAFIVERA – radar/GPS and stable feature modules */
(()=>{'use strict';
  let timer=null;
  async function tick(){
    try{
      const db=window.db,map=window.__mtrwMap;
      if(!db||!map||!window.L)return;
      const q=await db.from('profiles').select('gps_lat,gps_lng').single();
      const p=q.data;
      if(!p?.gps_lat||!p?.gps_lng)return;
      window.__mtrwProfile=p;
      let found=false;
      map.eachLayer(layer=>{
        if(!found&&layer instanceof L.Circle&&Math.abs(layer.getRadius()-500)<1){layer.setLatLng([p.gps_lat,p.gps_lng]);found=true}
      });
    }catch(e){}
  }
  function load(src,key){
    if(document.querySelector(`script[data-mtrw-feature="${key}"]`))return;
    const s=document.createElement('script');s.src=src;s.dataset.mtrwFeature=key;s.async=false;document.body.appendChild(s);
  }
  function boot(){
    let tries=0;
    timer=setInterval(()=>{tick();if(++tries>120)clearInterval(timer)},2000);
    tick();
    if(window.db){
      load('./mafivera-absence-report.js?v=20260917-clean1','absence');
      load('./mafivera-social-v2.js?v=20260917-clean1','social');
      load('./mafivera-alliance-v2.js?v=20260917-clean1','alliance');
      load('./mafivera-trade-notifier.js?v=20260917-clean1','trade');
      load('./mafivera-social-notifier.js?v=20260917-clean1','social-notifier');
      load('./mafivera-global-chat.js?v=20260917-clean1','chat');
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();