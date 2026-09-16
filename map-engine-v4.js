/* MAFIVERA V1 — standalone reliable map + territory grid */
(()=>{'use strict';
if(window.__mtrwMapEngineV4)return;window.__mtrwMapEngineV4=true;
const GRID_LAT=.0018,GRID_LNG=.0025,MAX_CELLS=2200,COST=250;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const css=document.createElement('style');css.textContent=`
.map-engine-v4-host{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;z-index:1!important;background:#111820!important}
.map-engine-v4-host .leaflet-container{width:100%!important;height:100%!important;background:#111820!important}
.map-engine-v4-host .leaflet-tile{opacity:1!important;filter:brightness(.82) saturate(.82)!important}
.mtrw-v4-grid-label{width:86px;height:38px;display:flex;align-items:center;justify-content:center;gap:3px;color:#e8edf4;font-size:16px;text-shadow:0 2px 5px #000;pointer-events:none}
.mtrw-v4-grid-label small{font-size:8px;color:#4ade80;font-weight:900}
.mtrw-v4-grid-label b{font-size:7px;color:#8fc8ff;letter-spacing:.5px}
.mtrw-v4-popup{min-width:190px;font:13px/1.45 system-ui,sans-serif}.mtrw-v4-popup button{width:100%;padding:10px;border:0;border-radius:9px;background:#d6ad2d;color:#111;font-weight:900;margin-top:8px}.mtrw-v4-popup .mine{color:#58a6ff;font-weight:900}.mtrw-v4-popup .resource{color:#4ade80;font-weight:800}
.bottom-nav{grid-template-columns:repeat(7,minmax(0,1fr))!important}
@media(max-width:520px){.bottom-nav{grid-template-columns:repeat(7,minmax(0,1fr))!important;gap:2px!important;padding:4px!important}.bottom-nav .bottom-btn{padding:3px 0!important;border-radius:14px!important}.bottom-nav .bottom-btn span{font-size:17px!important}.bottom-nav .bottom-btn small{font-size:6px!important;letter-spacing:.2px!important}}
`;document.head.appendChild(css);
const getUser=async()=>{try{const r=await window.db?.auth?.getSession();return r?.data?.session?.user||null}catch(e){return null}};
const keyFor=u=>u?.id?'mafivera:v1:save:'+u.id:null;
const read=u=>{try{const k=keyFor(u);return k?JSON.parse(localStorage.getItem(k)||'{}'):{} }catch(e){return{}}};
const write=(u,s)=>{try{const k=keyFor(u);if(k)localStorage.setItem(k,JSON.stringify(s))}catch(e){}};
const centerFromGps=()=>new Promise(resolve=>{if(!navigator.geolocation)return resolve([48.1351,11.582]);navigator.geolocation.getCurrentPosition(p=>resolve([p.coords.latitude,p.coords.longitude]),()=>resolve([48.1351,11.582]),{enableHighAccuracy:true,timeout:8000,maximumAge:30000})});
const props=(r,c)=>{const n=Math.abs(r*31+c*17),a=n%3,b=(r+c+9)%3,p=a===0?['material','money']:a===1?['reputation','material']:['money','reputation'];if(b===0)p.reverse();return p};
const propName=p=>p==='material'?'Material':p==='reputation'?'Ruhm':'Geld';
const run=async()=>{
 if(!window.L)return setTimeout(run,300);
 const root=document.querySelector('.mafivera-game'),host=document.querySelector('.world-map');if(!root||!host)return setTimeout(run,300);
 if(host.dataset.mtrwV4==='1')return;host.dataset.mtrwV4='1';host.classList.add('map-engine-v4-host');
 const u=await getUser(),s=read(u);let origin=s.worldOrigin||null;let center=origin?[origin.lat+GRID_LAT/2,origin.lng+GRID_LNG/2]:await centerFromGps();
 if(!origin){origin={lat:Math.floor(center[0]/GRID_LAT)*GRID_LAT,lng:Math.floor(center[1]/GRID_LNG)*GRID_LNG};s.worldOrigin=origin;write(u,s)}
 const map=L.map(host,{zoomControl:false,attributionControl:true,preferCanvas:true,zoomSnap:1,zoomDelta:1,minZoom:3,maxZoom:19,worldCopyJump:true}).setView(center,14);
 window.__mtrwLeafletMap=map;window.__mtrwMapV4=map;
 const osm=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,maxNativeZoom:19,keepBuffer:8,updateWhenIdle:false,updateWhenZooming:true,attribution:'© OpenStreetMap contributors'}).addTo(map);
 osm.on('tileerror',()=>console.warn('MAFIVERA: OSM-Kachel konnte nicht geladen werden'));
 const grid=L.layerGroup().addTo(map),labels=L.layerGroup().addTo(map);
 const owned=()=>{const x=read(u);return x.fields||{}};
 const cell=(r,c)=>{const id=`g_${r}_${c}`,f=owned()[id],pp=props(r,c);return{id,r,c,f,pp,lat:origin.lat+(r+.5)*GRID_LAT,lng:origin.lng+(c+.5)*GRID_LNG}};
 const openClaim=t=>{const x=read(u),is=!!x.fields?.[t.id];const text=`<div class="mtrw-v4-popup"><b>◆ ${esc('Sektor '+t.r+' / '+t.c)}</b><br>${is?'<span class="mine">DEIN GRUNDSTÜCK</span>':'Freies Grundstück'}<br><span class="resource">Eigenschaften: ${t.pp.map(propName).join(' + ')}</span>${t.pp.includes('material')?'<br>📦 Automatische Materialproduktion':''}${!is?`<button id="mtrwV4Claim">Beanspruchen · ${COST.toLocaleString('de-DE')} $</button>`:''}</div>`;const p=L.popup().setLatLng([t.lat,t.lng]).setContent(text).openOn(map);setTimeout(()=>document.getElementById('mtrwV4Claim')?.addEventListener('click',()=>{if(typeof window.mtrwClaim==='function')window.mtrwClaim(t.id);p.remove();setTimeout(draw,250)}),0)};
 const draw=()=>{grid.clearLayers();labels.clearLayers();if(map.getZoom()<11)return;const b=map.getBounds(),r1=Math.floor((b.getSouth()-origin.lat)/GRID_LAT)-1,r2=Math.floor((b.getNorth()-origin.lat)/GRID_LAT)+1,c1=Math.floor((b.getWest()-origin.lng)/GRID_LNG)-1,c2=Math.floor((b.getEast()-origin.lng)/GRID_LNG)+1;let R=r2-r1+1,C=c2-c1+1;if(R*C>MAX_CELLS){const n=Math.floor(Math.sqrt(MAX_CELLS)),mr=Math.floor((r1+r2)/2),mc=Math.floor((c1+c2)/2);r1=mr-Math.floor(n/2);r2=r1+n-1;c1=mc-Math.floor(n/2);c2=c1+n-1}for(let r=r1;r<=r2;r++)for(let c=c1;c<=c2;c++){const t=cell(r,c),mine=!!t.f,mat=t.pp.includes('material');const rect=L.rectangle([[t.lat-GRID_LAT/2,t.lng-GRID_LNG/2],[t.lat+GRID_LAT/2,t.lng+GRID_LNG/2]],{color:mine?'#1687ff':mat?'#22e59a':'#657080',weight:mine?2:1,fillColor:mine?'#1687ff':mat?'#22e59a':'#17202a',fillOpacity:mine?.2:mat?.055:.04,interactive:true});rect.on('click',()=>openClaim(t));grid.addLayer(rect);const icon=t.f?'⌂':mat?'📦':t.pp.includes('reputation')?'★':'◆';const m=L.marker([t.lat,t.lng],{interactive:false,icon:L.divIcon({className:'',html:`<div class="mtrw-v4-grid-label"><span>${icon}</span>${mine?'<b>DEIN GEBIET</b>':''}${mat?'<small>●</small>':''}</div>`,iconSize:[86,38],iconAnchor:[43,19]})});labels.addLayer(m)}};
 map.on('moveend zoomend',draw);window.addEventListener('resize',()=>map.invalidateSize(true));setTimeout(()=>map.invalidateSize(true),100);setTimeout(()=>map.invalidateSize(true),800);draw();
 // GPS button support: keep the real browser position as the player's map location when permitted.
 navigator.geolocation?.watchPosition(p=>{const x=p.coords.latitude,y=p.coords.longitude;if(!window.__mtrwV4Player){window.__mtrwV4Player=L.circleMarker([x,y],{radius:8,color:'#4ade80',fillColor:'#4ade80',fillOpacity:.9,weight:3}).addTo(map)}else window.__mtrwV4Player.setLatLng([x,y])},{enableHighAccuracy:true,maximumAge:15000,timeout:15000});
};run();
})();
