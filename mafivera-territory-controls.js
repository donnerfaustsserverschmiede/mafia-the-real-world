/* MAFIVERA – territory controls: demolish buildings / release territories + live modules + viewport repair */
(()=>{'use strict';
  let busy=false;
  const esc=s=>String(s??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const toast=(text,error=false)=>{const x=document.getElementById('toast');if(!x)return;x.textContent=text;x.className='toast show '+(error?'error':'');clearTimeout(toast.t);toast.t=setTimeout(()=>x.className='toast',2800)};
  const db=()=>window.db;
  function repairViewport(){
    const root=document.getElementById('gameRoot'),app=root?.querySelector('.mf-app'),map=app?.querySelector('.mf-map');
    const w=window.innerWidth,h=window.innerHeight;
    if(!root||!app)return;
    const set=(el,styles)=>Object.entries(styles).forEach(([k,v])=>el.style.setProperty(k,v,'important'));
    set(document.documentElement,{width:w+'px',minWidth:w+'px',maxWidth:w+'px',height:h+'px',margin:'0',padding:'0'});
    set(document.body,{width:w+'px',minWidth:w+'px',maxWidth:w+'px',height:h+'px',margin:'0',padding:'0',overflow:'hidden'});
    set(root,{position:'fixed',left:'0px',top:'0px',right:'auto',bottom:'auto',width:w+'px',minWidth:w+'px',maxWidth:w+'px',height:h+'px',margin:'0',padding:'0',transform:'none'});
    set(app,{position:'fixed',left:'0px',top:'0px',right:'auto',bottom:'auto',width:w+'px',minWidth:w+'px',maxWidth:w+'px',height:h+'px',margin:'0',padding:'0',transform:'none'});
    if(map)set(map,{position:'absolute',left:'0px',top:'0px',right:'0px',bottom:'0px',width:w+'px',maxWidth:w+'px',height:h+'px',maxHeight:h+'px'});
    window.dispatchEvent(new Event('resize'));
    setTimeout(()=>window.__mtrwMap?.invalidateSize?.({pan:false,animate:false}),50);
  }
  function zoneFromDrawer(){
    const body=document.getElementById('drawerBody');
    if(!body)return null;
    const el=body.querySelector('[data-action="upgrade"],[data-action="build-menu"],[data-action="station"]');
    if(!el)return null;
    return (el.dataset.zone||'').split('|')[0]||null;
  }
  async function rpc(name,args){const d=db();if(!d)throw Error('Datenbank noch nicht bereit.');const r=await d.rpc(name,args);if(r.error)throw r.error;return r.data}
  async function demolish(zone){
    if(busy)return;busy=true;
    try{
      if(!confirm('Gebäude wirklich abreißen? Du erhältst 50 % der bisher investierten Baukosten zurück.'))return;
      const r=await rpc('mafivera_demolish',{p_zone_key:zone});
      toast(`Gebäude abgerissen. Erstattung: ${Number(r?.refund||0).toLocaleString('de-DE')} $`);
      setTimeout(()=>location.reload(),350);
    }catch(e){toast(e.message||'Gebäude konnte nicht abgerissen werden.',true)}finally{busy=false}
  }
  async function leave(zone){
    if(busy)return;busy=true;
    try{
      if(!confirm('Gebiet wirklich verlassen? Das Gebiet wird sofort frei. Alle Gebäude gehen verloren. Stationierte Schläger werden in deinen Bestand zurückgeführt.'))return;
      const r=await rpc('mafivera_leave_territory',{p_zone_key:zone});
      const n=Number(r?.returned_hitmen||0);
      toast(`Gebiet freigegeben.${n?` ${n} Schläger zurückerhalten.`:''}`);
      setTimeout(()=>location.reload(),350);
    }catch(e){toast(e.message||'Gebiet konnte nicht freigegeben werden.',true)}finally{busy=false}
  }
  function enhance(){
    const body=document.getElementById('drawerBody');
    if(!body||document.getElementById('mtrwTerritoryControls'))return;
    const zone=zoneFromDrawer();if(!zone)return;
    const ownBuilding=body.querySelector('.building-card');
    const wrap=document.createElement('div');wrap.id='mtrwTerritoryControls';wrap.className='mtrw-territory-controls';
    if(ownBuilding){
      const b=document.createElement('button');b.className='action danger';b.type='button';b.textContent='🧱 Gebäude abreißen · 50 % Erstattung';b.onclick=()=>demolish(zone);wrap.appendChild(b);
    }
    const leaveBtn=document.createElement('button');leaveBtn.className='action danger';leaveBtn.type='button';leaveBtn.textContent='🚪 Gebiet verlassen · Gebiet freigeben';leaveBtn.onclick=()=>leave(zone);wrap.appendChild(leaveBtn);
    body.appendChild(wrap);
  }
  const observer=new MutationObserver(()=>setTimeout(enhance,0));
  function boot(){const body=document.getElementById('drawerBody');if(!body){setTimeout(boot,500);return}observer.observe(body,{childList:true,subtree:true});enhance()}
  function loadScript(src,key){
    if(document.querySelector(`script[data-mtrw-live="${key}"]`))return;
    const x=document.createElement('script');x.src=src;x.dataset.mtrwLive=key;x.async=false;document.body.appendChild(x);
  }
  function loadLiveModules(){
    const v='20260917-live5';
    loadScript(`./mafivera-v1-runtime-patch.js?v=${v}`,'runtime');
    loadScript(`./mafivera-dealer-ui.js?v=${v}`,'dealer-ui');
    loadScript(`./mafivera-buildings.js?v=${v}`,'buildings');
    loadScript(`./mafivera-admin.js?v=${v}`,'admin');
  }
  repairViewport();
  window.addEventListener('resize',repairViewport,{passive:true});
  const viewportObserver=new MutationObserver(()=>repairViewport());
  viewportObserver.observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{repairViewport();boot();loadLiveModules()});else{boot();loadLiveModules()}
})();