/* MAFIVERA — stable core bridge */
(()=>{'use strict';
if(window.MAFIVERA_CORE_FIX)return;window.MAFIVERA_CORE_FIX=true;
const GL=.0018,GW=.0025,P='mafivera:v1:save:';
const key=()=>Object.keys(localStorage).find(k=>k.startsWith(P));
const read=()=>{try{const k=key();return k?JSON.parse(localStorage.getItem(k)||'{}'):{} }catch(e){return{}}};
const write=s=>{const k=key();if(k)try{localStorage.setItem(k,JSON.stringify(s))}catch(e){}};
const gps=()=>window.mtrwLiveGps||read().gps||null;
const ensureOrigin=()=>{const s=read(),p=gps();if(!p)return;const next={lat:Math.floor(p.lat/GL)*GL,lng:Math.floor(p.lng/GW)*GW};if(!s.worldOrigin){s.worldOrigin=next;write(s)}window.mtrwWorldOrigin=s.worldOrigin};
const wrap=()=>{if(typeof window.mtrwClaim!=='function'||window.mtrwClaim.__stableCore)return;const old=window.mtrwClaim;const w=function(id){window.__mtrwBuildingCell=id;window.mtrwSelectedTerritoryId=id;return old.apply(this,arguments)};w.__stableCore=true;window.mtrwClaim=w};
const start=()=>{ensureOrigin();wrap()};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
window.addEventListener('mafivera:territoryChanged',()=>{ensureOrigin();wrap()});
window.addEventListener('mafivera:worldRefresh',()=>wrap());
window.MAFIVERA_CORE={read,write,ensureOrigin,constants:{GL,GW}};
})();