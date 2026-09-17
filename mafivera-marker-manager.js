/* MAFIVERA V2 — resource marker compatibility layer
   The official V2 runtime owns resource markers.
   This file only prevents legacy resource/building marker duplicates. */
(()=>{'use strict';
if(window.__mtrwResourceCompatibility)return;
window.__mtrwResourceCompatibility=true;
function style(){if(document.getElementById('mtrwResourceMarkerCSS'))return;const s=document.createElement('style');s.id='mtrwResourceMarkerCSS';s.textContent=`
.res-marker{display:none!important;visibility:hidden!important}
.building-marker,.mtrw-stable-building-marker{display:none!important;visibility:hidden!important}
.building-marker b,.mtrw-stable-building-marker b{display:none!important}
`;document.head.appendChild(s)}
style();
})();