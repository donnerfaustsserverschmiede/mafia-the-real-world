/* MAFIVERA — instant menu preview/cache, modeled after the inventory opening path. */
(()=>{'use strict';
const PREFIX='mtrw_menu_instant_v1_';
const MENUS={
 family:{title:'Familie',fallback:'<div class="hero"><span class="hero-icon">♜</span><div><b>Familie</b><p>Familienübersicht und Ränge.</p></div></div><div class="statgrid"><div><b>'+(Number(window.__mtrwProfile?.level||0))+'</b><small>Spielerlevel</small></div><div><b>'+(Number(window.__mtrwProfile?.reputation||0).toLocaleString('de-DE'))+'</b><small>Reputation</small></div></div>'},
 business:{title:'Produktion',fallback:'<div class="production-card"><h3>⚗️ Drogenproduktion</h3><div class="hint">Produktion und laufende Aufträge.</div><div class="list"><div class="hint">Drogen und Waffen können hier produziert werden.</div></div></div><div class="production-card"><h3>🏭 Waffenproduktion</h3><div class="hint">Waffenproduktion über die Waffenfabrik.</div><div class="list"><div class="hint">Waffenaufträge werden hier verwaltet.</div></div></div>'},
 hitmen:{title:'Schläger',fallback:'<div class="hero"><span class="hero-icon">👤</span><div><b>'+(Number(window.__mtrwProfile?.hitmen||0).toLocaleString('de-DE'))+' freie Schläger</b><p>Deine Schläger und Stationierungen.</p></div></div><div class="statgrid"><div><b>'+(Number(window.__mtrwProfile?.recruitment_centers||0).toLocaleString('de-DE'))+'</b><small>Zentren</small></div><div><b>'+(Number(window.__mtrwProfile?.garrison||0).toLocaleString('de-DE'))+'</b><small>Stationiert</small></div><div><b>'+(Number(window.__mtrwProfile?.max_hitmen||0).toLocaleString('de-DE'))+'</b><small>Kapazität</small></div></div>'},
 social:{title:'Sozial',fallback:'<div class="social-block"><h3>👥 Sozial</h3><div class="hint">Freunde, Freundschaftsanfragen und Spielerrangliste.</div></div>'}
};
function key(k){return PREFIX+k}
function read(k){try{const x=JSON.parse(localStorage.getItem(key(k))||'null');return x&&x.html?x:null}catch(_){return null}}
function write(title,html){const k=Object.keys(MENUS).find(x=>MENUS[x].title===title);if(!k||!html)return;try{localStorage.setItem(key(k),JSON.stringify({title,html,at:Date.now()}))}catch(_){} }
function bindCached(){const body=document.getElementById('drawerBody');if(!body)return;body.querySelectorAll('[data-action]').forEach(b=>{b.onclick=()=>window.mtrwMenuAction?.(b.dataset.action,b.dataset.zone)});if(window.mtrwBindSocial)window.mtrwBindSocial();const close=document.getElementById('drawerClose');if(close)close.onclick=()=>document.getElementById('drawer')?.classList.add('hidden')}
function preview(k){const body=document.getElementById('drawerBody'),title=document.getElementById('drawerTitle'),drawer=document.getElementById('drawer');if(!body||!title||!drawer)return false;const c=read(k);title.textContent=MENUS[k].title;body.dataset.mtrwInstantPreview='1';body.innerHTML=c?.html||MENUS[k].fallback;drawer.classList.remove('hidden');bindCached();return true}
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
