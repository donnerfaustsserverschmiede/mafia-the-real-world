/* MAFIVERA V2 — persistent map markers
   Resources stay owned by this engine.
   Building blips are rendered from the player's actual world_territories coordinates.
   Dealer remains exclusively owned by dealer-v2. */
(()=>{'use strict';
if(window.__mtrwResourceMarkerEngine)return;
window.__mtrwResourceMarkerEngine=true;
const GLAT=.0018,GLNG=.0025,R=5;
let map=null,resourceLayer=null,buildingLayer=null,lastKey='';
const BUILD={warehouse:{name:'Lager',icon:'📦'},money:{name:'Geldwäsche',icon:'💵'},club:{name:'Clubhaus',icon:'🥃'},lab:{name:'Chemielabor',icon:'⚗️'},market:{name:'Schwarzmarkt',icon:'🕶️'},watch:{name:'Wachposten',icon:'🛡️'},hideout:{name:'Gangversteck',icon:'🏚️'},recruitment:{name:'Rekrutierungszentrum',icon:'🏢'}};
const res=(r,c)=>{const h=Math.abs((r*73856093)^(c*19349663))%6;return h===0?['money','material']:h===1?['material','reputation']:h===2?['money','reputation']:h===3?['material','money']:h===4?['reputation','money']:['material','reputation']};
const icon=x=>x==='money'?'$':x==='material'?'▣':'★';
function style(){if(document.getElementById('mtrwResourceMarkerCSS'))return;const s=document.createElement('style');s.id='mtrwResourceMarkerCSS';s.textContent=`
.res-marker{display:none!important;visibility:hidden!important}
.mtrw-resource-marker{background:transparent!important;border:0!important;width:26px!important;height:26px!important;pointer-events:none!important}
.mtrw-resource-marker span{display:flex;align-items:center;justify-content:center;width:26px;height:26px;font:900 19px/26px system-ui,sans-serif;text-shadow:0 2px 4px #000,0 0 3px #000;filter:drop-shadow(0 1px 2px #000)}
.mtrw-resource-marker .money{color:#ffd34d}.mtrw-resource-marker .material{color:#b9d7ff}.mtrw-resource-marker .reputation{color:#ff8ee6}
.building-marker{display:none!important;visibility:hidden!important}
.mtrw-real-building{background:transparent!important;border:0!important;width:118px!important;height:66px!important;pointer-events:auto!important}
.mtrw-real-building .building-icon{width:44px;height:44px;margin:0 auto;display:flex;align-items:center;justify-content:center;border:2px solid #ffb52e;border-radius:12px;background:#111722ee;box-shadow:0 5px 16px #000b,0 0 10px #ffb52e55;font-size:30px;line-height:40px}
.mtrw-real-building .building-name{display:block;margin:3px auto 0;width:max-content;max-width:116px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:2px 7px;border:1px solid #ffb52e;border-radius:7px;background:#111722f5;color:#fff;font:900 10px/13px system-ui,sans-serif;box-shadow:0 3px 9px #000}
`;document.head.appendChild(s)}
function renderResources(){if(!map||!resourceLayer)return;const c=map.getCenter(),r0=Math.floor(c.lat/GLAT),c0=Math.floor(c.lng/GLNG),key=`${r0}:${c0}`;if(key===lastKey)return;lastKey=key;resourceLayer.clearLayers();for(let r=r0-R;r<=r0+R;r++)for(let c=c0-R;c<=c0+R;c++){const [lat,lng]=[(r+.5)*GLAT,(c+.5)*GLNG];res(r,c).forEach((p,i)=>L.marker([lat+(i?0.00025:-0.00025),lng+(i?0.00032:-0.00032)],{interactive:false,zIndexOffset:1000,icon:L.divIcon({className:'mtrw-resource-marker',html:`<span class="${p}">${icon(p)}</span>`,iconSize:[26,26],iconAnchor:[13,13]})}).addTo(resourceLayer))}}
async function renderBuildings(){if(!map||!buildingLayer||!window.db)return;try{const u=await window.db.auth.getUser();const uid=u?.data?.user?.id;if(!uid)return;const q=await window.db.from('world_territories').select('zone_key,center_lat,center_lng,building_type,building_level,building_finish_at').eq('owner_id',uid).not('building_type','is',null);if(q.error)return;buildingLayer.clearLayers();(q.data||[]).forEach(t=>{const lat=Number(t.center_lat),lng=Number(t.center_lng);if(!Number.isFinite(lat)||!Number.isFinite(lng))return;const b=BUILD[t.building_type]||{name:t.building_type||'Gebäude',icon:'🏗️'};const ready=!t.building_finish_at||new Date(t.building_finish_at)<=new Date();const title=`${b.name} · Stufe ${Number(t.building_level||1)}${ready?'':' · im Bau'}`;L.marker([lat,lng],{interactive:true,zIndexOffset:9000,icon:L.divIcon({className:'mtrw-real-building',html:`<div class="building-icon">${b.icon}</div><span class="building-name">${title}</span>`,iconSize:[118,66],iconAnchor:[59,33]})}).addTo(buildingLayer)})}catch(e){}}
function boot(){map=window.__mtrwMap;if(!map||typeof L==='undefined')return;style();resourceLayer=L.layerGroup().addTo(map);buildingLayer=L.layerGroup().addTo(map);renderResources();renderBuildings();map.on('moveend',()=>{renderResources();renderBuildings()});map.on('zoomend',()=>{lastKey='';renderResources();renderBuildings()});setInterval(renderBuildings,5000)}
const wait=setInterval(()=>{if(window.__mtrwMap&&window.db){clearInterval(wait);boot()}},250);setTimeout(()=>clearInterval(wait),30000);
})();