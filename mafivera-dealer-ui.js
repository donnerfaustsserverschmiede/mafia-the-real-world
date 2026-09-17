/* MAFIVERA — dealer UI compatibility shell. The single live dealer is owned by mafivera-marker-manager.js. */
(()=>{'use strict';
if(window.__mtrwDealerUICompat)return;window.__mtrwDealerUICompat=true;
const s=document.createElement('style');s.textContent='#mtrwDealerLegacyMarker,#dealerLegacyMarker,.dealer-legacy-marker{display:none!important}';document.head.appendChild(s);
})();