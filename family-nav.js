/* MAFIVERA V1 — Familie navigation */
(()=>{
  'use strict';
  if(window.__mtrwFamilyNav)return;
  window.__mtrwFamilyNav=true;
  const getSave=()=>{try{const id=window.__mtrwUserId;if(id)return JSON.parse(localStorage.getItem('mafivera:v1:save:'+id)||'{}');const k=Object.keys(localStorage).find(x=>x.startsWith('mafivera:v1:save:'));return k?JSON.parse(localStorage.getItem(k)||'{}'):{} }catch(e){return{}}};
  const add=()=>{
    const nav=document.querySelector('.bottom-nav');
    if(!nav||document.getElementById('familyNav'))return false;
    const b=document.createElement('button');
    b.id='familyNav';b.className='bottom-btn';
    b.innerHTML='<span>👥</span><small>FAMILIE</small>';
    b.onclick=()=>{
      const drawer=document.getElementById('drawer'),title=document.getElementById('drawerTitle'),body=document.getElementById('drawerBody');
      if(!drawer||!title||!body)return;
      const s=getSave();
      title.textContent='Familie';
      body.innerHTML=`<div class="panel-hero"><span>👥</span><div><b>${s.family?String(s.family):'Noch keine Familie'}</b><p>Familie &amp; Beziehungen</p></div></div><button class="panel-action" type="button">👥 Familienübersicht</button><p class="panel-hint">Hier werden Familien, Mitglieder, Bündnisse und gemeinsame Gebiete verwaltet.</p>`;
      drawer.classList.remove('hidden');
      nav.querySelectorAll('.bottom-btn').forEach(x=>x.classList.remove('active'));b.classList.add('active');
    };
    nav.insertBefore(b,nav.firstElementChild);
    nav.style.gridTemplateColumns='repeat(7,1fr)';
    return true;
  };
  const loop=()=>{if(!add())setTimeout(loop,300)};
  loop();
  setInterval(add,1500);
})();
