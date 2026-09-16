/* MAFIVERA — gemeinsames Gebäude-/Rekrutierungsmenü + größere feste Navigation */
(()=>{'use strict';
const style=document.createElement('style');style.textContent=`
#recruitNav{display:none!important}
.bottom-nav{height:92px!important;bottom:0!important;left:8px!important;right:8px!important;grid-template-columns:repeat(6,1fr)!important;padding:7px!important;border-radius:22px 22px 0 0!important;touch-action:none!important;user-select:none!important}
.bottom-nav .bottom-btn{min-height:76px!important;font-size:12px!important;gap:6px!important}
.bottom-nav .bottom-btn span{font-size:25px!important;line-height:1!important}.bottom-nav .bottom-btn small{font-size:10px!important;letter-spacing:.6px!important;white-space:nowrap!important}
.drawer{bottom:104px!important}
.recruit-inline{display:none!important}
.recruit-merge-card{margin-top:8px;padding:13px;border:1px solid rgba(214,173,45,.25);border-radius:14px;background:rgba(214,173,45,.05)}
.recruit-merge-card b{font-size:13px}.recruit-merge-card small{display:block;color:#888;margin-top:5px;font-size:10px;line-height:1.4}
.recruit-merge-card button{margin-top:9px}
@media(max-width:480px){.bottom-nav{height:96px!important;left:5px!important;right:5px!important}.bottom-nav .bottom-btn{min-height:80px!important}.bottom-nav .bottom-btn span{font-size:23px!important}.bottom-nav .bottom-btn small{font-size:9px!important}.drawer{bottom:108px!important}}
`;
document.head.appendChild(style);
const inject=()=>{
 const title=document.getElementById('drawerTitle'),body=document.getElementById('drawerBody');
 if(!title||!body||title.textContent!=='Gebäude errichten')return;
 if(body.querySelector('[data-recruit-merge]'))return;
 const id=window.__mtrwBuildingCell;if(!id)return;
 const s=(()=>{try{return JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k=>k.startsWith('mafivera:v1:save:'))||'')||'{}')}catch(e){return {}}})();
 const centers=s.recruitmentCenters||{},c=centers[id],count=Number(s.hitmen||0),box=document.createElement('div');
 box.className='recruit-merge-card';box.dataset.recruitMerge='1';
 box.innerHTML=c?`🏢 <b>Rekrutierungszentrum · Level ${c.level||1}/10</b><small>Produziert automatisch Schläger. Aktueller Bestand: <strong>${count.toLocaleString('de-DE')}</strong></small><button class="panel-action" data-open-recruit>🕵️ Rekrutierungszentrum verwalten</button>`:`🏢 <b>Rekrutierungszentrum</b><small>Auf diesem eroberten Feld bauen · Start: 1 Schläger alle 120 Sekunden.</small><button class="panel-action" data-build-recruit>🏢 Rekrutierungszentrum bauen · 1.000 $</button>`;
 body.appendChild(box);
 box.querySelector('[data-open-recruit]')?.addEventListener('click',()=>window.mtrwOpenRecruitment?.());
 box.querySelector('[data-build-recruit]')?.addEventListener('click',()=>{
   if(typeof window.mtrwClaim!=='function')return;
   window.mtrwClaim(id);
   setTimeout(()=>document.querySelector('.recruit-build')?.click(),120);
 });
};
let last='';setInterval(()=>{const t=document.getElementById('drawerTitle')?.textContent||'';if(t!==last){last=t;setTimeout(inject,30)}else if(t==='Gebäude errichten'&&!document.querySelector('[data-recruit-merge]'))inject()},250);
})();
