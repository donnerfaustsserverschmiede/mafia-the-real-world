/* MAFIVERA V2 — marker compatibility layer
   The working map-marker system is owned by mafivera-v1.js.
   Resource markers ($ / ▣ / ★) stay visible.
   Redundant building icons stay hidden.
   Dealer is handled exclusively by mafivera-dealer-v2.js. */
(()=>{'use strict';
if(window.__mtrwMarkerCompatibilityLoaded)return;
window.__mtrwMarkerCompatibilityLoaded=true;
const s=document.createElement('style');
s.id='mtrwMarkerCompatibilityCSS';
s.textContent='.building-marker,.mtrw-stable-building-marker{display:none!important;visibility:hidden!important}';
document.head.appendChild(s);
})();
