/* MAFIVERA V2 — stable resource marker layer
   Building icons are intentionally not rendered on the main map. */
(()=>{'use strict';
if(window.__mtrwStableMarkerManager)return;window.__mtrwStableMarkerManager=true;
const s=document.createElement('style');s.id='mtrwStableMarkerCSS';s.textContent='.building-marker,.mtrw-stable-building-marker{display:none!important}';document.head.appendChild(s);
})();
