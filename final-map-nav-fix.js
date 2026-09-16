/* MAFIVERA V1 — live map/UI final bridge */
(()=>{
'use strict';
if(window.__mtrwFinalBridge)return;window.__mtrwFinalBridge=true;
const load=()=>{if(document.querySelector('script[data-mtrw-live-map-v3]'))return;const s=document.createElement('script');s.src='./live-map-ui-v3.js?v=3';s.dataset.mtrwLiveMapV3='1';document.body.appendChild(s)};
load();setTimeout(load,500);setTimeout(load,1500);
})();
