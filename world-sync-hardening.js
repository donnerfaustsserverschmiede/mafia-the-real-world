/* MAFIVERA — offline-first bootstrap + canonical visual loader */
(()=>{'use strict';
const wait=()=>{if(!window.db)return setTimeout(wait,250);window.dispatchEvent(new Event('mafivera:worldRefresh'));if(!window.__mtrwWorldVisualLoaded){window.__mtrwWorldVisualLoaded=true;const s=document.createElement('script');s.src='./world-visual-fix.js?v=2';s.onload=()=>window.dispatchEvent(new Event('mafivera:worldRefresh'));document.body.appendChild(s)}if(!window.__mtrwOfflineLoaded){window.__mtrwOfflineLoaded=true;const s=document.createElement('script');s.src='./offline-world.js?v=1';document.body.appendChild(s)}};wait();
})();
