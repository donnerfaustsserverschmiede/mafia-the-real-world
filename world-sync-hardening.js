/* MAFIVERA — authoritative world bootstrap: offline shell + reconnect sync + visuals */
(()=>{'use strict';
const loadOnce=(key,src)=>{if(window[key])return;window[key]=true;const s=document.createElement('script');s.src=src;s.onload=()=>window.dispatchEvent(new Event('mafivera:worldRefresh'));document.body.appendChild(s)};
const boot=()=>{if(!window.db)return setTimeout(boot,250);window.dispatchEvent(new Event('mafivera:worldRefresh'));loadOnce('__mtrwWorldVisualLoaded','./world-visual-fix.js?v=2');loadOnce('__mtrwOfflineLoaded','./offline-world.js?v=1');loadOnce('__mtrwSyncBridgeLoaded','./sync-bridge.js?v=1');if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(e=>console.warn('[MAFIVERA SW]',e));};boot();
})();
