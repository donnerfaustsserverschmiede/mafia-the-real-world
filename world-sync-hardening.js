/* MAFIVERA — sync guard: the canonical world-sync owns publishing. */
(()=>{'use strict';
const wait=()=>{if(!window.db)return setTimeout(wait,250);window.dispatchEvent(new Event('mafivera:worldRefresh'));};
wait();
})();
