/* MAFIVERA V1 — keep radar centered on the player's latest server GPS */
(()=>{'use strict';
let timer=null;
async function tick(){try{const db=window.db,map=window.__mtrwMap;if(!db||!map||!window.L)return;const q=await db.from('profiles').select('gps_lat,gps_lng').single();const p=q.data;if(!p?.gps_lat||!p?.gps_lng)return;window.__mtrwProfile=p;let found=false;map.eachLayer(layer=>{if(!found&&layer instanceof L.Circle&&Math.abs(layer.getRadius()-500)<1){layer.setLatLng([p.gps_lat,p.gps_lng]);found=true}})}catch(e){}}
function boot(){let tries=0;timer=setInterval(()=>{tick();if(++tries>120){clearInterval(timer)}},2000);tick()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();})();