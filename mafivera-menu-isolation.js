/* MAFIVERA MENU ISOLATION LAYER
   Each main menu gets its own UI shell. Opening the shell never waits for
   Supabase, GPS, map rendering, production collection, or another menu. */
(()=>{'use strict';
const MENUS={
  family:{title:'Familie',icon:'♜',text:'Familienbereich wird geöffnet …'},
  business:{title:'Geschäfte',icon:'🏢',text:'Geschäfte werden geöffnet …'},
  hitmen:{title:'Schläger',icon:'👤',text:'Schlägerbereich wird geöffnet …'},
  social:{title:'Sozial',icon:'♧',text:'Sozialbereich wird geöffnet …'}
};
let lastOpen=0,lastPanel='';
function open(panel){
  const cfg=MENUS[panel],d=document.getElementById('drawer'),b=document.getElementById('drawerBody'),t=document.getElementById('drawerTitle');
  if(!cfg||!d||!b||!t)return;
  const now=Date.now();
  if(panel===lastPanel&&now-lastOpen<250)return;
  lastPanel=panel;lastOpen=now;
  t.textContent=cfg.title;
  b.innerHTML='<div class="mtrw-menu-shell" data-menu-shell="'+panel+'"><div class="mtrw-menu-shell-icon">'+cfg.icon+'</div><b>'+cfg.title+'</b><span>'+cfg.text+'</span></div>';
  d.classList.remove('hidden');
}
function bind(){
  if(window.__mtrwMenuIsolationBound)return;
  window.__mtrwMenuIsolationBound=true;
  document.addEventListener('pointerup',e=>{
    const b=e.target.closest?.('.bottom-btn'); if(!b)return;
    const p=b.dataset.panel; if(MENUS[p])open(p);
  },true);
  document.addEventListener('click',e=>{
    const b=e.target.closest?.('.bottom-btn'); if(!b)return;
    const p=b.dataset.panel; if(MENUS[p])open(p);
  },true);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind);else bind();
const st=document.createElement('style');
st.textContent='.mtrw-menu-shell{min-height:220px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;text-align:center;color:#fff;padding:30px}.mtrw-menu-shell-icon{font-size:54px;line-height:1}.mtrw-menu-shell b{font-size:22px}.mtrw-menu-shell span{color:#8f9aa7;font-size:14px}.mtrw-menu-shell[data-menu-shell="family"]{border-color:#8d68c7}.mtrw-menu-shell[data-menu-shell="business"]{border-color:#c99a43}.mtrw-menu-shell[data-menu-shell="hitmen"]{border-color:#9da7b2}.mtrw-menu-shell[data-menu-shell="social"]{border-color:#65a9c8}';
document.head.appendChild(st);
window.__mtrwMenuIsolation={version:'1.0',open};
})();