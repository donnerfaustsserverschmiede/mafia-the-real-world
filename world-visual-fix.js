/* MAFIVERA — canonical 10-cell world visuals, stable colors, synced building markers */
(()=>{'use strict';
const GL=.0018,GW=.0025,RADIUS=10;
const PROP_COLOR={money:'#22c55e',reputation:'#facc15',material:'#8b5a2b'};
const PROP_ICON={money:'$',reputation:'★',material:'▣'};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const read=()=>{try{const k=Object.keys(localStorage).find(x=>x.startsWith('mafivera:v1:save:'));return k?JSON.parse(localStorage.getItem(k)||'{}'):{} }catch(e){return{}}};
const propOf=(s,id)=>{const p=s.fields?.[id]?.props;return Array.isArray(p)?p[0]:(p||'material')};
const cell=id=>{const m=/^g_(-?\d+)_(-?\d+)$/.exec(id);return m?{r:+m[1],c:+m[2]}:null};
const getCenter=()=>{const s=read();return window.mtrwLiveGps||s.gps||s.worldOrigin||null};
let timer=0;
const styleWorld=()=>{const map=window.mtrwMap;if(!map||!window.L)return;const s=read(),p=getCenter();if(!p||!s.worldOrigin)return;const pr=Math.floor((p.lat-s.worldOrigin.lat)/GL),pc=Math.floor((p.lng-s.worldOrigin.lng)/GW);
 map.eachLayer(l=>{if(!(l instanceof L.Rectangle)||!l.getBounds)return;const w=Number(l.options?.weight||0);if(w!==1&&w!==2.5)return;const c=l.__mtrwCell||(()=>{const q=l.getBounds().getCenter();return{r:Math.floor((q.lat-s.worldOrigin.lat)/GL),c:Math.floor((q.lng-s.worldOrigin.lng)/GW)}})();const inside=Math.abs(c.r-pr)<=RADIUS&&Math.abs(c.c-pc)<=RADIUS;if(!inside){map.removeLayer(l);return}const id=`g_${c.r}_${c.c}`,mine=!!s.fields?.[id],pname=propOf(s,id),color=mine?'#3b82f6':PROP_COLOR[pname]||'#8b5a2b';l.__mtrwCell=c;l.setStyle({color,fillColor:color,weight:mine?3:2,fillOpacity:mine?.30:.18});l.bringToBack()});
};
const bind=()=>{const map=window.mtrwMap;if(!map||map.__mtrwWorldVisualBound)return;map.__mtrwWorldVisualBound=true;const schedule=()=>{clearTimeout(timer);timer=setTimeout(styleWorld,120)};map.on('moveend zoomend',schedule);window.addEventListener('mafivera:territoryChanged',schedule);window.addEventListener('mafivera:worldRefresh',schedule);setTimeout(styleWorld,500)};
let n=0;const wait=()=>{bind();if(!window.mtrwMap&&n++<100)setTimeout(wait,200)};wait();
const buildings=()=>{const base=window.MAFIVERA_ALL_BUILDINGS||window.MAFIVERA_BUILDINGS||{};return {...base,recruitment:base.recruitment||{name:'Rekrutierungszentrum',icon:'🏢'}}};
const renderRemoteBuildings=async()=>{const map=window.mtrwMap;if(!map||!window.db)return;const s=read(),o=s.worldOrigin;if(!o)return;let layer=window.__mtrwSyncedBuildingLayer;if(!layer)layer=L.layerGroup().addTo(map),window.__mtrwSyncedBuildingLayer=layer;let rows=[];try{const r=await window.db.from('world_territories').select('zone_key,owner_id,center_lat,center_lng,building_type,updated_at');if(!r.error)rows=r.data||[]}catch(e){return}
 const pr=Math.floor(((getCenter()?.lat||o.lat)-o.lat)/GL),pc=Math.floor(((getCenter()?.lng||o.lng)-o.lng)/GW),wanted=new Set();
 rows.forEach(r=>{if(!r.building_type)return;const id=`g_${Math.floor((r.center_lat-o.lat)/GL)}_${Math.floor((r.center_lng-o.lng)/GW)}`,c=cell(id);if(!c||Math.abs(c.r-pr)>RADIUS||Math.abs(c.c-pc)>RADIUS)return;const d=buildings()[r.building_type];if(!d)return;wanted.add(r.zone_key);let m=layer.getLayers().find(x=>x.__zoneKey===r.zone_key);const mine=r.owner_id===window.__mtrwCurrentUserId;if(!m){m=L.marker([r.center_lat,r.center_lng],{interactive:false,zIndexOffset:700,icon:L.divIcon({className:'building-marker synced-building-marker',html:`<div class="mtrw-building-pin"><span>${d.icon}</span><b>${esc(d.name)}</b></div>`,iconSize:[96,52],iconAnchor:[48,26]})});m.__zoneKey=r.zone_key;layer.addLayer(m)} });
 layer.eachLayer(m=>{if(!wanted.has(m.__zoneKey))layer.removeLayer(m)});
};
const initSync=()=>{if(!window.db)return setTimeout(initSync,500);window.db.auth.getSession().then(x=>{window.__mtrwCurrentUserId=x.data?.session?.user?.id||null;renderRemoteBuildings()});window.addEventListener('mafivera:worldRefresh',renderRemoteBuildings);window.addEventListener('mafivera:territoryChanged',renderRemoteBuildings);setInterval(renderRemoteBuildings,15000)};initSync();
})();
