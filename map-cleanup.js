/* MAFIVERA — final map/game cleanup bootstrap */
(()=>{'use strict';
const load=src=>{const s=document.createElement('script');s.src=src;s.onload=()=>console.log('[MAFIVERA] '+src+' loaded');s.onerror=()=>console.error('[MAFIVERA] '+src+' failed');document.body.appendChild(s)};
setTimeout(()=>load('./mafivera-core-fix.js?v=2'),300);
setTimeout(()=>load('./ui-stability-final.js?v=1'),1800);
})();
