/* MAFIVERA — instant menu preview/cache, modeled after the inventory opening path. */
(()=>{'use strict';
const PREFIX='mtrw_menu_instant_v2_';
const MENUS={
 family:{title:'Familie',fallback:'<div class="hero"><span class="hero-icon">♜</span><div><b>Familie</b><p>Familie, Mitglieder, Ränge und Tagesbeitrag.</p></div></div><div class="statgrid"><div><b>'+(Number(window.__mtrwProfile?.level||0))+'</b><small>Level</small></div><div><b>'+(Number(window.__mtrwProfile?.reputation||0).toLocaleString('de-DE'))+'</b><small>Reputation</small></div></div><div class="list"><button class="action primary" data-action="family-list">👥 Familien suchen</button><button class="action" data-action="donate-family">💰 Tagesbeitrag 100 $ → Familienpunkte</button></div>'},
 business:{title:'Produktion',fallback:'<div class="production-card"><h3>⚗️ Drogenproduktion</h3><div class="production-field"><label for="productionDrug">1. Droge auswählen</label><select id="productionDrug"><option value="cocaine">Kokain · 25 Material/Stück</option><option value="weed">Cannabis · 10 Material/Stück</option><option value="meth">Methamphetamin · 40 Material/Stück</option><option value="heroin">Heroin · 60 Material/Stück</option></select></div><div class="production-field"><label for="productionDrugQty">2. Menge</label><input id="productionDrugQty" type="number" min="1" value="1" inputmode="numeric"></div><button class="action primary" data-action="start-drug-production">⚗️ Drogenproduktion starten</button><h4>Aktive Drogenproduktionen</h4><div id="instantDrugJobs" class="list"><div class="hint">Keine laufende Drogenproduktion.</div></div></div><div class="production-card"><h3>🏭 Waffenproduktion</h3><div class="production-field"><label for="productionWeapon">1. Waffe auswählen</label><select id="productionWeapon"><option value="weapon_melee">Hieb- und Stichwaffen · 10 Waffenteile/Stück</option><option value="weapon_handgun">Handfeuerwaffen · 25 Waffenteile/Stück</option><option value="weapon_smg">Maschinenpistolen · 50 Waffenteile/Stück</option><option value="weapon_longarm">Langwaffen · 100 Waffenteile/Stück</option></select></div><div class="production-field"><label for="productionWeaponQty">2. Menge</label><input id="productionWeaponQty" type="number" min="1" value="1" inputmode="numeric"></div><button class="action primary" data-action="start-weapon-production">🏭 Waffenproduktion starten</button><h4>Aktive Waffenproduktionen</h4><div id="instantWeaponJobs" class="list"><div class="hint">Keine laufende Waffenproduktion.</div></div></div>'},
 hitmen:{title:'Schläger',fallback:'<div class="hero"><span class="hero-icon">👤</span><div><b>'+(Number(window.__mtrwProfile?.hitmen||0).toLocaleString('de-DE'))+' freie Schläger</b><p>Deine Schläger und Stationierungen.</p></div></div><div class="statgrid"><div><b>'+(Number(window.__mtrwProfile?.recruitment_centers||0).toLocaleString('de-DE'))+'</b><small>Zentren</small></div><div><b>'+(Number(window.__mtrwProfile?.garrison||0).toLocaleString('de-DE'))+'</b><small>Stationiert</small></div><div><b>'+(Number(window.__mtrwProfile?.max_hitmen||0).toLocaleString('de-DE'))+'</b><small>Kapazität</small></div></div>'},
 social:{title:'Sozial',fallback:'<div class="tabs social-tabs"><button class="mini active" data-social="tab" data-tab="friends">👥 Freundeliste</button><button class="mini" data-social="tab" data-tab="add">➕ Freunde hinzufügen</button><button class="mini" data-social="tab" data-tab="rank">🏆 Spielerrangliste</button></div><div class="social-block"><h3>Bestätigte Freunde</h3><div class="list"><div class="hint">Noch keine bestätigten Freunde.</div></div></div>'}
}
function key(k){return PREFIX+k}
function read(k){try{const x=JSON.parse(localStorage.getItem(key(k))||'null');return x&&x.html?x:null}catch(_){return null}}
function write(title,html){const k=Object.keys(MENUS).find(x=>MENUS[x].title===title);if(!k||!html)return;try{localStorage.setItem(key(k),JSON.stringify({title,html,at:Date.now()}))}catch(_){} }
function bindCached(){const body=document.getElementById('drawerBody');if(!body)return;body.querySelectorAll('[data-action]').forEach(b=>{b.onclick=()=>window.mtrwMenuAction?.(b.dataset.action,b.dataset.zone)});if(window.mtrwBindSocial)window.mtrwBindSocial();const close=document.getElementById('drawerClose');if(close)close.onclick=()=>document.getElementById('drawer')?.classList.add('hidden')}
function preview(k){const body=document.getElementById('drawerBody'),title=document.getElementById('drawerTitle'),drawer=document.getElementById('drawer');if(!body||!title||!drawer)return false;const c=read(k);title.textContent=MENUS[k].title;body.dataset.mtrwInstantPreview='1';body.innerHTML=c?.html||MENUS[k].fallback;drawer.classList.remove('hidden');bindCached();
 setTimeout(()=>{try{if(k==='family')window.mtrwOpenFamily?.();else if(k==='business')window.mtrwOpenBusiness?.();else if(k==='hitmen')window.mtrwOpenHitmen?.();else if(k==='social')window.mtrwOpenSocial?.()}catch(_){}},0);
 return true}
function install(){const body=document.getElementById('drawerBody');if(!body){setTimeout(install,50);return}
 const observer=new MutationObserver(()=>{if(body.dataset.mtrwInstantPreview==='1'){body.dataset.mtrwInstantPreview='0';return}const t=(document.getElementById('drawerTitle')?.textContent||'').trim();if(MENUS&&Object.values(MENUS).some(m=>m.title===t))write(t,body.innerHTML)});observer.observe(body,{childList:true,subtree:true});
 let lastPanel='',lastOpen=0;
 const openFromEvent=(ev)=>{
   const el=ev.target?.closest?.('.bottom-btn');
   if(!el)return;
   const k=el.dataset.panel;
   if(!MENUS[k])return;
   const now=Date.now();
   if(k===lastPanel&&now-lastOpen<450)return;
   lastPanel=k;lastOpen=now;
   preview(k);
 };
 // Delegated handlers: the navigation buttons are created dynamically by app(), so
 // binding directly during script startup misses them. Pointerdown opens the drawer
 // before the later async nav() work can block the visible menu.
 document.addEventListener('pointerdown',openFromEvent,true);
 document.addEventListener('click',openFromEvent,true);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
