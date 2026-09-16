/* MAFIVERA V1 — Familie navigation fallback */
(()=>{
  'use strict';
  if(window.__mtrwFamilyNav)return;
  window.__mtrwFamilyNav=true;
  const add=()=>{
    const nav=document.querySelector('.bottom-nav');
    if(!nav)return false;
    if(nav.querySelector('[data-panel="family"]'))return true;
    const b=document.createElement('button');
    b.className='bottom-btn';
    b.dataset.panel='family';
    b.innerHTML='<span>♜</span><small>FAMILIE</small>';
    nav.insertBefore(b,nav.children[1]||null);
    return true;
  };
  const loop=()=>{if(!add())setTimeout(loop,300)};
  loop();
})();
