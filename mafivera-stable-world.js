/* MAFIVERA — authoritative global world layer */
(()=>{'use strict';
if(window.__MAFIVERA_STABLE_WORLD)return;window.__MAFIVERA_STABLE_WORLD=true;
const GL=.0018,GW=.0025,R=5,KEY='mafivera:v1:save:';
const getKey=()=>Object.keys(localStorage).find(k=>k.startsWith(KEY));
const read=()=>{try{const k=getKey();return k?JSON.parse(localStorage.getItem(k)||'{}'):{} }catch(e){return{}}};
const write=s=>{const k=getKey();if(k)try{localStorage.setItem(k,JSON.stringify(s))}catch(e){}};
const centerCell=(r,c)=>({lat:(r+.5)*GL,lng:(c+.5)*GW});
const globalRC=(lat,lng)=>({r:Math.floor(lat/GL),c:Math.floor(lng/GW)});
const zkey=(r,c)=>`z_${r}_${c}`;
const localCenter=(s,id)=>{const m=/^g_(-?\d+)_(-?\d+)$/.exec(id);if(!m||!s.worldOrigin)return null;return{lat:s.worldOrigin.lat+(+m[1]+.5)*GL,lng:s.worldOrigin.lng+(+m[2]+.5)*GW}};
const localToGlobal=(s,id)=>{const p=localCenter(s,id);return p?globalRC(p.lat,p.lng):null};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const prop=(r,c)=>{const n=Math.abs(r*31+c*17)%3;return n===0?'material':n===1?'reputation':'money'};
const icon=p=>p==='money'?'$':p==='reputation'?'★':'▣';
const iconClass=p=>`mafivera-resource ${p}`;
const toast=t=>{const e=document.getElementById('toast');if(!e)return;e.textContent=t;e.classList.add('show');clearTimeout(e._stableToast);e._stableToast=setTimeout(()=>e.classList.remove('show'),2600)};
let map=null,layer=null,resourceLayer=null,remoteRows=[],renderQueued=false,lastSignature='';
const hideLegacy=()=>{if(!map||!window.L)return;map.eachLayer(l=>{if(l===layer||l===resourceLayer||l===window.__mtrwBuildingLayer)return;if(l instanceof L.Rectangle){l.setStyle({opacity:0,fillOpacity:0,interactive:false});l.__mafiveraLegacy=true}if(l instanceof L.LayerGroup&&l!==layer&&l!==resourceLayer&&l!==window.__mtrwBuildingLayer){l.eachLayer?.(x=>{if(x instanceof L.Rectangle){x.setStyle({opacity:0,fillOpacity:0,interactive:false});x.__mafiveraLegacy=true}})}})};
const setupLayers=()=>{if(!map||!window.L)return;layer=layer||L.layerGroup().addTo(map);resourceLayer=resourceLayer||L.layerGroup().addTo(map);layer.bringToFront();resourceLayer.bringToFront();};
const playerRC=()=>{const s=read(),p=window.mtrwLiveGps||s.gps;if(!p)return null;return globalRC(p.lat,p.lng)};
const visible=(r,c)=>{const p=playerRC();return p&&Math.max(Math.abs(r-p.r),Math.abs(c-p.c))<=R};
const ownSet=()=>{const s=read(),set=new Set();Object.keys(s.fields||{}).forEach(id=>{const rc=localToGlobal(s,id);if(rc)set.add(zkey(rc.r,rc.c))});return set};
const render=()=>{if(!map||!window.L)return;setupLayers();hideLegacy();const s=read(),p=playerRC();if(!p)return;const own=ownSet(),rows=new Map((remoteRows||[]).map(r=>[r.zone_key,r]));const threats=new Set();(s.threatFields||[]).forEach(t=>{const rc=localToGlobal(s,t.cellId);if(rc&&visible(rc.r,rc.c))threats.add(zkey(rc.r,rc.c))});const signature=[p.r,p.c,[...own].sort().join(','),remoteRows.map(x=>x.zone_key+':'+x.owner_id).sort().join(','),[...threats].sort().join(',')].join('|');if(signature===lastSignature)return;lastSignature=signature;layer.clearLayers();resourceLayer.clearLayers();
for(let r=p.r-R;r<=p.r+R;r++)for(let c=p.c-R;c<=p.c+R;c++){const key=zkey(r,c),center=centerCell(r,c),remote=rows.get(key),isOwn=own.has(key)||remote?.owner_id===window.__mtrwUserId,enemy=remote&&remote.owner_id!==window.__mtrwUserId,heist=threats.has(key);let color='#8b949e',fill='transparent',opacity=0;if(isOwn){color='#2388ff';fill='#2388ff';opacity=.22}else if(enemy||heist){color='#ff3030';fill='#ff3030';opacity=.24}else{color='#64707c';fill='transparent';opacity=0}const rect=L.rectangle([[center.lat-GL/2,center.lng-GW/2],[center.lat+GL/2,center.lng+GW/2]],{color,weight:isOwn||enemy||heist?2.5:1,fillColor:fill,fillOpacity:opacity,opacity:opacity?1:.45,interactive:true,__mafiveraFinal:true});rect.bindPopup(`<div class="popup-card"><b>${isOwn?'🔵 Eigenes Gebiet':enemy?'🔴 Gegnerisches Gebiet':heist?'🔴 Heist-Ziel':'Freies Feld'}</b><br>Sektor ${r>=0?'N':'S'}${Math.abs(r)}-${c>=0?'O':'W'}${Math.abs(c)}${remote?.building_type?`<br>🏗️ ${esc(remote.building_type)}`:''}${enemy?`<br><button onclick="window.MAFIVERA_ATTACK?.('${esc(key)}')">🏴 Besetzen</button>`:''}${!isOwn&&!enemy&&!heist?`<br><button onclick="window.mtrwClaim?.('g_${r-p.r}_${c-p.c}')">◆ Beanspruchen</button>`:''}</div>`);layer.addLayer(rect);const pty=prop(r,c);const marker=L.marker([center.lat,center.lng],{interactive:false,icon:L.divIcon({className:'mafivera-resource-wrap',html:`<span class="${iconClass(pty)}">${icon(pty)}</span>`,iconSize:[34,34],iconAnchor:[17,17],__mafiveraFinal:true});resourceLayer.addLayer(marker)}
}
};
const queue=()=>{if(renderQueued)return;renderQueued=true;requestAnimationFrame(()=>{renderQueued=false;render()})};
const pull=async()=>{if(!window.db)return;const{data}=await window.db.from('world_territories').select('zone_key,owner_id,center_lat,center_lng,defense_points,garrison,building_type,building_defense,support_bonus,claimed_at,updated_at');if(data){remoteRows=data;window.MAFIVERA_WORLD_ROWS=data;queue()}};
const syncClaim=async()=>{const s=read();if(!s.worldOrigin)return;for(const id of Object.keys(s.fields||{})){const p=localCenter(s,id);if(!p)continue;const rc=globalRC(p.lat,p.lng);await window.db.rpc('sync_world_territory',{p_zone_key:zkey(rc.r,rc.c),p_center_lat:p.lat,p_center_lng:p.lng,p_defense_points:25,p_garrison:Number(s.built?.[id]?.troops||0),p_building_type:s.built?.[id]?.type||null,p_building_defense:0,p_support_bonus:0}).catch(()=>null)}};
const refresh=async()=>{await pull();queue()};
const init=async()=>{let tries=0;const boot=()=>{map=window.mtrwMap||window.__mtrwLeafletMap;if(map&&window.db){window.__mtrwUserId=window.db.auth.getSession?null:null;window.db.auth.getSession().then(({data})=>{window.__mtrwUserId=data?.session?.user?.id||null;setupLayers();hideLegacy();queue();pull();try{window.db.channel('mafivera-final-world').on('postgres_changes',{event:'*',schema:'public',table:'world_territories'},()=>refresh()).subscribe()}catch(e){}map.on('moveend',queue);window.addEventListener('mafivera:worldRefresh',refresh);window.addEventListener('mafivera:territoryChanged',refresh);setInterval(()=>{pull()},30000)});return}if(++tries<100)setTimeout(boot,100)};boot()};init();
window.MAFIVERA_STABLE_WORLD={refresh,render,read,globalRC,zkey};
})();