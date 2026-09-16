/* MAFIVERA V1 — final reliable map bootstrap */
(()=>{'use strict';
if(window.__mtrwFinalReliableBootstrap)return;window.__mtrwFinalReliableBootstrap=true;
const load=src=>{if(document.querySelector(`script[src*="${src.split('?')[0]}"]`))return;const s=document.createElement('script');s.src=src;document.body.appendChild(s)};
const fixNav=()=>{const n=document.querySelector('.bottom-nav');if(!n)return;const b=[...n.querySelectorAll('.bottom-btn')];n.style.setProperty('grid-template-columns','repeat(7,minmax(0,1fr))','important');n.style.setProperty('overflow','hidden','important');b.forEach(x=>{x.style.setProperty('min-width','0','important');x.style.setProperty('width','100%','important')})};
const boot=()=>{fixNav();if(window.L&&document.querySelector('.world-map'))load('./map-engine-v4.js?v=4')};
new MutationObserver(boot).observe(document.documentElement,{childList:true,subtree:true});boot();setInterval(boot,500);
})();
