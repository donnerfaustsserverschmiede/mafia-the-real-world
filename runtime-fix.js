/* MAFIVERA V1 runtime safeguards */
(()=>{'use strict';
/* game.js currently uses a strict-mode event variable; keep a global binding so older cached builds cannot crash on event spawn. */
if(!Object.prototype.hasOwnProperty.call(globalThis,'e'))globalThis.e=null;
/* Leaflet CSS is also supplied here as a fallback for cached/partial page loads. */
if(!document.querySelector('link[data-mafivera-leaflet]')){const l=document.createElement('link');l.rel='stylesheet';l.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';l.dataset.mafiveraLeaflet='1';document.head.appendChild(l)}
})();