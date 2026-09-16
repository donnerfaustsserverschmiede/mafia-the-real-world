/* MAFIVERA — sync guard + canonical visual loader */
(()=>{'use strict';
const wait=()=>{if(!window.db)return setTimeout(wait,250);window.dispatchEvent(new Event('mafivera:worldRefresh'));if(!window.__mtrwWorldVisualLoaded){window.__mtrwWorldVisualLoaded=true;const s=document.createElement('script');s.src='./world-visual-fix.js?v=1';s.onload=()=>window.dispatchEvent(new Event('mafivera:worldRefresh'));document.body.appendChild(s)}};wait();
})();
