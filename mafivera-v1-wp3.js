/* MAFIVERA V1 — clean single runtime */
(()=>{'use strict';
const SUPA_URL='https://ufqdntsxgqcxtszufbtv.supabase.co',SUPA_KEY='sb_publishable_PDao9J9Pz87uSotESNeGbg_GSGh5u49';
const GLAT=.0018,GLNG=.0025,R=5,CLAIM=250;
const BUILD={warehouse:{name:'Lager',icon:'📦',cost:800,build:60,desc:'+1.000 Material-Lagerkapazität je Stufe · Standard 5.000.'},money:{name:'Geldwäsche',icon:'💵',cost:250,build:45,desc:'Stufe 1: +5% Geld pro Minute · je weitere Stufe +5%.'},club:{name:'Clubhaus',icon:'🥃',cost:750,build:60,desc:'Stufe 1: +5% Rufpunkte pro Minute · je weitere Stufe +5%.'},lab:{name:'Chemielabor',icon:'⚗️',cost:500,build:90,desc:'Stufe 1: +5% Material pro Minute und 5% schnellere Produktion · je weitere Stufe +5%.'},market:{name:'Schwarzmarkt',icon:'🕶️',cost:900,build:90,desc:'Stufe 1: +5% auf den Dealerpreis · je weitere Stufe +5%.'},watch:{name:'Wachposten',icon:'🛡️',cost:600,build:75,desc:'+5% Verteidigungsbonus je Stufe.'},hideout:{name:'Gangversteck',icon:'🏚️',cost:1000,build:120,desc:'+5% Gebäudewirkung je Stufe · Schläger stationieren.'},recruitment:{name:'Rekrutierungszentrum',icon:'👤',cost:1000,build:120,desc:'Stufe 1: 5% schnellere Schlägerproduktion · je weitere Stufe +5%.'},headquarters:{name:'Hauptquartier',icon:'🏛️',cost:10000,build:180,desc:'Stufe 1: +5% Gebäudewirkung · je weitere Stufe +5% · maximal Stufe 20. Nur einmal.'},weapon_factory:{name:'Waffenfabrik',icon:'🏭',cost:2500,build:180,desc:'Stufe 1: +5% Waffenteile-Sammelgeschwindigkeit · je Stufe weitere +5% · nur auf Waffenteile-Feldern.'}};
let db,uid,profile={},map,grid=[],markers,playerMarker,playerRadius,lastCell=null,world={},owners={},territoryRelations={},prodTimer,prodBusy=false,gpsWatchId=null,gpsLatest=null,gpsLastApplied=0,nearbyPlayerMarkers={},nearbyRefreshBusy=false,nearbyRefreshTimer=null;
const $=id=>document.getElementById(id),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Number(n||0).toLocaleString('de-DE'),money=n=>fmt(n)+' $',zkey=(r,c)=>`z_${r}_${c}`,parse=z=>{const m=/^z_(-?\d+)_(-?\d+)$/.exec(z||'');return m?{r:+m[1],c:+m[2]}:null},center=(r,c)=>[(r+.5)*GLAT,(c+.5)*GLNG];
const res=(r,c)=>{const h=Math.abs(r*73856093+c*19349663)%100;return h<5?['weapon_parts']:h<45?['money']:h<80?['material']:['reputation']};
const ri=x=>x==='money'?'$':x==='material'?'◆':x==='reputation'?'★':'⚙️',rn=x=>x==='money'?'Geld':x==='material'?'Material':x==='reputation'?'Reputation':'Waffenteile';
const toast=(t,e=false)=>{const x=$('toast');if(!x)return;x.textContent=t;x.className='toast show '+(e?'error':'');clearTimeout(toast.t);toast.t=setTimeout(()=>x.className='toast',2800)};
async function rpc(n,a={}){try{const r=await db.rpc(n,a);if(r.error)throw r.error;return r.data}catch(e){if(window.__mtrwOfflineCore?.networkError(e)&&window.__mtrwOfflineCore?.handle)return window.__mtrwOfflineCore.handle(n,a);throw e}}
function sync(p){profile={...profile,...p};window.__mtrwProfile=profile;window.__mtrwUserId=uid;[['hudMoney','money'],['hudDrugs','product'],['hudHitmen','hitmen'],['hudLevel','level']].forEach(([a,b])=>{if($(a))$(a).textContent=fmt(profile[b])});const materialCap=Number(profile.material_cap||10000),weaponCap=Number(profile.weapon_parts_cap||10000);if($('hudMaterial'))$('hudMaterial').textContent=fmt(profile.material||0);if($('hudMaterialCap'))$('hudMaterialCap').textContent='/'+fmt(materialCap);if($('hudWeaponParts'))$('hudWeaponParts').textContent=fmt(profile.weapon_parts||0);if($('hudWeaponPartsCap'))$('hudWeaponPartsCap').textContent='/'+fmt(weaponCap);if($('hudStorage'))$('hudStorage').textContent=`${fmt(profile.material||0)}/${fmt(materialCap)}`;if($('profileName'))$('profileName').textContent=profile.username||'Spieler';renderHud()}
function hudValue(keys){for(const k of keys){const v=profile[k];if(v!==undefined&&v!==null&&v!=='')return Number(v)||0}return 0}
function renderHud(){const name=$('mtrwHudName');if(name)name.textContent=profile.username||'Spieler';const level=Math.max(1,Number(profile.level||1)),xp=Math.max(0,Number(profile.xp||0)),next=Math.max(xp+1,Number(profile.next_level_xp||profile.xp_next||((level)*1000))),pct=Math.max(0,Math.min(100,xp/next*100));if($('mtrwHudLevel'))$('mtrwHudLevel').textContent='Level '+fmt(level);if($('mtrwHudXp'))$('mtrwHudXp').textContent=fmt(xp)+' / '+fmt(next)+' XP';if($('mtrwHudProgress'))$('mtrwHudProgress').style.width=pct+'%';[['cash',['cash','money','wallet','cash_balance']],['bank',['bank','bank_money','bank_balance']],['black',['black_money','blackmoney','dirty_money','illicit_money']],['gold',['gold_coins','gold','premium_currency']]].forEach(([id,keys])=>{const el=$('mtrwHud-'+id);if(el)el.textContent=fmt(hudValue(keys))})}
async function boot(){const previous={...profile};let d;try{d=await rpc('mafivera_bootstrap')}catch(e){if(window.__mtrwOfflineCore?.localBootstrap){d=window.__mtrwOfflineCore.localBootstrap();if(d){window.__mtrwOfflineCore.notice(true,'OFFLINE-MODUS · Fortschritt wird lokal gespeichert')}else throw e}else throw e}if(d?.profile){sync(d.profile);const lat=Number(d.profile.gps_lat),lng=Number(d.profile.gps_lng);if(Number.isFinite(lat)&&Number.isFinite(lng))window.__mtrwPlayerLocation={lat,lng,accuracy:Number(d.profile.gps_accuracy||0)};const materialIn=Math.max(0,Number(d.profile.material||0)-Number(previous.material||0));const partsIn=Math.max(0,Number(d.profile.weapon_parts||0)-Number(previous.weapon_parts||0));if(previous.id&& (materialIn>0||partsIn>0)){const bits=[];if(materialIn)bits.push('📦 +'+fmt(materialIn)+' Material');if(partsIn)bits.push('⚙️ +'+fmt(partsIn)+' Waffenteile');toast('Eingang · '+bits.join(' · '))}}if(d?.profile&&window.__mtrwOfflineCore&&!window.__mtrwOfflineCore.isOffline())window.__mtrwOfflineCore.snapshot(d.profile,world);return d}
function globalCell(lat,lng){return{r:Math.floor(lat/GLAT),c:Math.floor(lng/GLNG)}}
function makeCell(r,c){const [lat,lng]=center(r,c);return{zone_key:zkey(r,c),r,c,lat,lng,resources:res(r,c)}}
function cellBounds(r,c){return[[r*GLAT,c*GLNG],[(r+1)*GLAT,(c+1)*GLNG]]}
function relationColor(rel){return rel==='family'?'#a855f7':rel==='ally'?'#22c55e':rel==='friend'?'#f59e0b':'#ef4444'}
function renderGrid(){if(!map)return;grid.forEach(x=>x.remove());grid=[];markers?.clearLayers();window.__mtrwGridRects=grid;}
async function loadWorld(){
  const cacheKey='mtrw_world_visible_'+uid;
  const loadCached=()=>{
    try{
      const cached=JSON.parse(localStorage.getItem(cacheKey)||'null');
      if(cached?.world&&typeof cached.world==='object'&&Object.keys(cached.world).length){
        world=cached.world;owners=cached.owners||{};territoryRelations=cached.territoryRelations||{};
        window.__mtrwWorld=world;renderGrid();return true;
      }
    }catch(_){}
    return false;
  };
  if(window.__mtrwOfflineCore?.isOffline()){
    const s=await window.__mtrwOfflineCore.ensure();world=s?.world||{};owners={};territoryRelations={};window.__mtrwWorld=world;renderGrid();return
  }
  loadCached();
  const all=[];const PAGE=1000;
  for(let from=0;;from+=PAGE){
    const q=await db.from('world_territories').select('*').range(from,from+PAGE-1);
    if(q.error){if(!loadCached())toast(q.error.message,true);return}
    const rows=q.data||[];all.push(...rows);if(rows.length<PAGE)break
  }
  world={};owners={};territoryRelations={};
  all.forEach(t=>{world[t.zone_key]=t});
  window.__mtrwWorld=world;window.__mtrwOfflineCore?.snapshot(profile,world);
  const ids=all.map(t=>t.owner_id).filter(Boolean),unique=[...new Set(ids)];
  for(let from=0;from<unique.length;from+=PAGE){
    const chunk=unique.slice(from,from+PAGE);
    const p=await db.from('profiles').select('id,username,mafia_name').in('id',chunk);
    if(p.error){toast(p.error.message,true);return}
    (p.data||[]).forEach(x=>owners[x.id]=x.username||x.mafia_name||x.id);
    try{const rr=await db.rpc('mtrw_user_relations',{p_user_ids:chunk});if(!rr.error)(rr.data||[]).forEach(x=>territoryRelations[x.user_id]=x.relation)}catch(_){}
  }
  try{
    const centerPoint=map?.getCenter?.();const centerLat=Number.isFinite(Number(centerPoint?.lat))?Number(centerPoint.lat):(Number.isFinite(Number(profile.gps_lat))?Number(profile.gps_lat):51.1657);const centerLng=Number.isFinite(Number(centerPoint?.lng))?Number(centerPoint.lng):(Number.isFinite(Number(profile.gps_lng))?Number(profile.gps_lng):10.4515);const centerCell=globalCell(centerLat,centerLng);
    const visible={};
    for(let r=centerCell.r-R;r<=centerCell.r+R;r++)for(let c=centerCell.c-R;c<=centerCell.c+R;c++){const k=zkey(r,c);if(world[k])visible[k]=world[k]}
    localStorage.setItem(cacheKey,JSON.stringify({world:visible,owners,territoryRelations,updated_at:Date.now()}));
  }catch(_){}
  renderGrid()
}function initMap(){
 if(map)return;
 const pos=Number.isFinite(Number(profile.gps_lat))&&Number.isFinite(Number(profile.gps_lng))?[Number(profile.gps_lat),Number(profile.gps_lng)]:[51.1657,10.4515];
 const el=$('mfMap');if(!el)throw Error('Kartencontainer fehlt');
 map=L.map(el,{zoomControl:false,preferCanvas:true,worldCopyJump:false,fadeAnimation:false,zoomAnimation:false,markerZoomAnimation:false,zoomSnap:1,zoomDelta:1}).setView(pos,15);
 window.__mtrwMap=map;
 /* Real street map remains visible; only old game tiles and markers are disabled. */
 L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
  maxZoom:19,attribution:'&copy; OpenStreetMap-Mitwirkende',crossOrigin:true
 }).addTo(map);
 L.control.zoom({position:'bottomright'}).addTo(map);
 markers=L.layerGroup();
 playerMarker=null;playerRadius=null;
 const initialLat=Number(profile.gps_lat),initialLng=Number(profile.gps_lng);
 if(Number.isFinite(initialLat)&&Number.isFinite(initialLng)&&Math.abs(initialLat)>0&&Math.abs(initialLng)>0)renderPlayerLocation(initialLat,initialLng,Number(profile.gps_accuracy)||0);
 map.on('moveend',()=>{renderGrid();window.mtrwSyncHeistMarkers?.()});
 map.on('zoomend',()=>{renderGrid();window.mtrwSyncHeistMarkers?.()});
 const resize=()=>{if(!map)return;requestAnimationFrame(()=>map.invalidateSize({pan:false,animate:false}))};
 resize();
 [50,150,300,800,1500,3000].forEach(ms=>setTimeout(resize,ms));
 if(window.ResizeObserver){const ro=new ResizeObserver(resize);ro.observe(el);map._mtrwResizeObserver=ro}
 renderGrid();
 setTimeout(()=>{if(map&&!document.hidden)map.invalidateSize({pan:false,animate:false})},500);
}
function distanceMeters(aLat,aLng,bLat,bLng){
 const rad=v=>v*Math.PI/180,R=6371000,dLat=rad(bLat-aLat),dLng=rad(bLng-aLng);
 const x=Math.sin(dLat/2)**2+Math.cos(rad(aLat))*Math.cos(rad(bLat))*Math.sin(dLng/2)**2;
 return 2*R*Math.asin(Math.sqrt(x));
}
function openNearbyPlayer(p){
 const safe={id:p.id,username:p.username||'Spieler',mafia_name:p.mafia_name||'',level:Number(p.level||0),reputation:Number(p.reputation||0),xp:Number(p.xp||0)};
 drawer('Spieler',`<div class="player-profile"><div class="player-avatar">👤</div><div><h2>${esc(safe.username)}</h2><small>${esc(safe.mafia_name||'Familienlos')}</small></div></div><div class="list"><button class="action primary" data-nearby-action="profile">👤 Profil ansehen</button><button class="action" data-nearby-action="friend">🤝 Als Freund hinzufügen</button><button class="action" data-nearby-action="family">♜ Zur Familie einladen</button></div><small class="muted">Freundschafts- und Familieneinladungen werden in einem späteren Update aktiviert.</small>`);
 const body=$('drawerBody');
 body?.querySelector('[data-nearby-action="profile"]')?.addEventListener('click',()=>socialProfile(safe,'map'));
 body?.querySelector('[data-nearby-action="friend"]')?.addEventListener('click',()=>toast('Freundschaftsanfragen werden später freigeschaltet.'));
 body?.querySelector('[data-nearby-action="family"]')?.addEventListener('click',()=>toast('Familieneinladungen werden später freigeschaltet.'));
}
async function refreshNearbyPlayers(){
 if(nearbyRefreshBusy||!db||!uid||!window.__mtrwPlayerLocation)return;
 nearbyRefreshBusy=true;
 try{
  const me=window.__mtrwPlayerLocation,lat=Number(me.lat),lng=Number(me.lng);
  if(!Number.isFinite(lat)||!Number.isFinite(lng))return;
  const latDelta=500/111320,lngDelta=500/(111320*Math.max(.15,Math.cos(lat*Math.PI/180)));
  const q=await db.from('profiles').select('id,username,mafia_name,level,reputation,xp,gps_lat,gps_lng').neq('id',uid).gte('gps_lat',lat-latDelta).lte('gps_lat',lat+latDelta).gte('gps_lng',lng-lngDelta).lte('gps_lng',lng+lngDelta).limit(100);
  if(q.error)throw q.error;
  const found=new Set();
  const players=(q.data||[]).filter(p=>{
   const plat=Number(p.gps_lat),plng=Number(p.gps_lng);
   return p.id&&Number.isFinite(plat)&&Number.isFinite(plng)&&distanceMeters(lat,lng,plat,plng)<=500;
  });
  players.forEach(p=>{
   const plat=Number(p.gps_lat),plng=Number(p.gps_lng),ll=[plat,plng];
   found.add(p.id);
   // Bei dicht beieinander stehenden Spielern werden die Namensschilder in getrennte Höhen gestaffelt.
   const labelRank=players.filter(other=>other.id!==p.id&&distanceMeters(plat,plng,Number(other.gps_lat),Number(other.gps_lng))<=80&&String(other.id)<String(p.id)).length;
   const playerLabel=String(p.username||p.mafia_name||'Spieler').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
   const labelTop=22+labelRank*15;
   const html='<div class="mtrw-np-wrap"><div class="mtrw-np-dot"></div><div class="mtrw-np-label" style="bottom:'+labelTop+'px">'+playerLabel+'</div></div>';
   const icon=L.divIcon({className:'mtrw-nearby-player-icon',html,iconSize:[20,20],iconAnchor:[10,10]});
   if(!nearbyPlayerMarkers[p.id]){
    const marker=L.marker(ll,{icon,title:p.username||p.mafia_name||'Spieler',keyboard:true,zIndexOffset:800}).addTo(map);
    marker.on('click',()=>openNearbyPlayer(p));
    nearbyPlayerMarkers[p.id]=marker;
   }else{
    const marker=nearbyPlayerMarkers[p.id];
    marker.setLatLng(ll);
    marker.setIcon(icon);
    marker.off('click');
    marker.on('click',()=>openNearbyPlayer(p));
   }
  });
  Object.keys(nearbyPlayerMarkers).forEach(id=>{if(!found.has(id)){map.removeLayer(nearbyPlayerMarkers[id]);delete nearbyPlayerMarkers[id]}});
 }catch(e){console.warn('Nearby player refresh:',e?.message||e)}
 finally{nearbyRefreshBusy=false}
}
function renderPlayerLocation(lat,lng,acc){
 if(!map||!window.L)return;
 const ll=[lat,lng];
 if(!playerRadius){
  playerRadius=L.circle(ll,{radius:500,color:'#39a7ff',weight:2,opacity:.95,fillColor:'#2995ff',fillOpacity:.10,interactive:false}).addTo(map);
 }else playerRadius.setLatLng(ll);
 if(!playerMarker){
  const icon=L.divIcon({className:'mtrw-player-marker',html:'<span class="mtrw-player-marker-pulse"></span><span class="mtrw-player-marker-core"></span>',iconSize:[30,30],iconAnchor:[15,15]});
  playerMarker=L.marker(ll,{icon,keyboard:false,title:'Dein Standort',zIndexOffset:1000}).addTo(map);
  playerMarker.bindTooltip('Dein Standort',{direction:'top',offset:[0,-13]});
 }else playerMarker.setLatLng(ll);
 window.__mtrwPlayerRadiusMeters=500;
}
function updateGps(lat,lng,acc){
 profile.gps_lat=lat;profile.gps_lng=lng;profile.gps_accuracy=acc;window.__mtrwProfile=profile;window.__mtrwPlayerLocation={lat,lng,accuracy:acc};
 renderPlayerLocation(lat,lng,acc);
 window.dispatchEvent(new CustomEvent('mtrw:location-updated',{detail:{lat,lng,accuracy:acc,radius:500}}));refreshNearbyPlayers();
 const c=globalCell(lat,lng),k=zkey(c.r,c.c);
 if(k!==lastCell){lastCell=k;if(!window.__mtrwGpsMapCentered){map?.setView([lat,lng],map.getZoom(),{animate:false});window.__mtrwGpsMapCentered=true}renderGrid();window.mtrwRefreshHeistFields?.()}
 rpc('mafivera_set_location',{p_lat:lat,p_lng:lng,p_accuracy:acc}).catch(()=>{});
}
function startGps(){
 if(!nearbyRefreshTimer){refreshNearbyPlayers();nearbyRefreshTimer=setInterval(refreshNearbyPlayers,10000)}
 if(!navigator.geolocation){toast('GPS wird von diesem Gerät nicht unterstützt.',true);return}
 if(gpsWatchId!==null)return;
 gpsWatchId=navigator.geolocation.watchPosition(p=>{
  gpsLatest={lat:p.coords.latitude,lng:p.coords.longitude,accuracy:p.coords.accuracy};
  const now=Date.now();
  if(!gpsLastApplied||now-gpsLastApplied>=10000){gpsLastApplied=now;updateGps(gpsLatest.lat,gpsLatest.lng,gpsLatest.accuracy)}
 },e=>toast('GPS: '+(e.message||'Standort nicht verfügbar'),true),{enableHighAccuracy:true,maximumAge:10000,timeout:20000});
 setInterval(()=>{
  if(!gpsLatest||Date.now()-gpsLastApplied<10000)return;
  gpsLastApplied=Date.now();updateGps(gpsLatest.lat,gpsLatest.lng,gpsLatest.accuracy);
 },1000);
}
function drawer(title,html){$('drawerTitle').textContent=title;$('drawerBody').innerHTML=html;$('drawer').classList.remove('hidden');$('drawerBody').querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>action(b.dataset.action,b.dataset.zone))}
function close(){ $('drawer').classList.add('hidden') }
function nav(n){document.querySelectorAll('.bottom-btn').forEach(b=>b.classList.toggle('active',b.dataset.panel===n));if(n==='map')return close();if(n==='family')return family();if(n==='business')return business();if(n==='hitmen')return hitmen();if(n==='social')return social()}
function adjacentToMine(z){const c=parse(z);if(!c)return false;return Object.values(world).some(t=>{if(t?.owner_id!==uid)return false;const q=parse(t.zone_key);return q&&Math.max(Math.abs(q.r-c.r),Math.abs(q.c-c.c))===1})}
function territory(z){const c=parse(z);if(!c)return;const t=world[z]||{zone_key:z,owner_id:null,defense_points:25,garrison:0,building_type:null,building_level:1,resources:res(c.r,c.c)},own=t.owner_id===uid,foreign=!!t.owner_id&&!own,ready=!t.building_finish_at||new Date(t.building_finish_at)<=new Date(),hasHQ=Object.values(world).some(x=>x?.owner_id===uid&&x?.building_type==='headquarters'),hasTerritory=Object.values(world).some(x=>x?.owner_id===uid),adjacent=!own&&!foreign&&adjacentToMine(z),canExpand=adjacent;let h=`<div class="territory-head"><div><h3>Sektor ${c.r>=0?'N':'S'}${Math.abs(c.r)}-${c.c>=0?'O':'W'}${Math.abs(c.c)}</h3><span class="badge ${own?'own':foreign?'enemy':'free'}">${own?'DEIN GEBIET':foreign?'FREMDES GEBIET':'FREIES FELD'}</span></div><button class="close-btn" data-action="close">×</button></div><div class="statgrid"><div><b>${fmt(t.defense_points||25)}</b><small>Verteidigung</small></div><div><b>${fmt(t.garrison||0)}</b><small>Schläger</small></div></div>`;if(foreign)h+=`<div class="hint">Gebiet von <b>${esc(owners[t.owner_id]||'Spieler')}</b>. Angriffe müssen direkt an dein eigenes Gebiet angrenzen.</div><button class="action danger" data-action="attack" data-zone="${z}">⚔️ Gebiet angreifen</button>`;else if(!own){const gpsLat=Number(profile.gps_lat),gpsLng=Number(profile.gps_lng),targetCell=globalCell(t.center_lat??center(c.r,c.c)[0],t.center_lng??center(c.r,c.c)[1]),playerCell=(Number.isFinite(gpsLat)&&Number.isFinite(gpsLng))?globalCell(gpsLat,gpsLng):null,nearLocation=!!playerCell&&Math.max(Math.abs(playerCell.r-targetCell.r),Math.abs(playerCell.c-targetCell.c))<=1;if(!hasTerritory)h+=nearLocation?`<div class="hint">Dein erstes Gebiet kannst du direkt an deinem Standort oder auf einem der angrenzenden Felder übernehmen. Das HQ spielt dabei keine Rolle.</div><button class="action primary" data-action="claim" data-zone="${z}">◆ Gebiet beanspruchen · ${money(CLAIM)}</button>`:`<div class="hint">Dein erstes Gebiet kann nur an deinem aktuellen Standort oder auf einem der angrenzenden Felder übernommen werden. Aktiviere GPS, um deinen Standort zu verwenden.</div>`;else {
  const gpsLat=Number(profile.gps_lat),gpsLng=Number(profile.gps_lng);
  const targetCell=globalCell(t.center_lat??center(c.r,c.c)[0],t.center_lng??center(c.r,c.c)[1]);
  const playerCell=(Number.isFinite(gpsLat)&&Number.isFinite(gpsLng))?globalCell(gpsLat,gpsLng):null;
  const nearLocation=!!playerCell&&Math.max(Math.abs(playerCell.r-targetCell.r),Math.abs(playerCell.c-targetCell.c))<=1;
  h+=nearLocation
    ? `<div class="hint">Du stehst auf diesem Feld oder direkt daneben. Du kannst das freie Gebiet für ${money(CLAIM)} übernehmen – ohne Schläger. Für weiter entfernte freie Felder nutze Schläger.</div><button class="action primary" data-action="claim" data-zone="${z}">◆ Gebiet beanspruchen · ${money(CLAIM)}</button>`
    : `<div class="hint">Dieses Feld liegt außerhalb deiner aktuellen GPS-Reichweite. Mit Schlägern kannst du es übernehmen, wenn es direkt an eines deiner eigenen Gebiete angrenzt.</div><button class="action danger" data-action="claim-remote" data-zone="${z}">⚔️ Mit Schlägern einnehmen</button>`;
;}}else if(t.building_type){const b=BUILD[t.building_type],level=Math.max(1,Number(t.building_level||1));h+=`<div class="building-card"><span>${b?.icon||'🏗️'}</span><div><b>${esc(b?.name||t.building_type)}</b><small>Stufe ${level}/20${ready?'':' · Bau läuft'}</small></div>${ready?(level>=20?`<button class="mini" disabled>Maximum</button>`:`<button class="mini" data-action="upgrade" data-zone="${z}">Ausbauen</button>`):''}</div>`;if(ready&&(t.building_type==='hideout'||t.building_type==='watch'))h+=`<button class="action" data-action="station" data-zone="${z}">👤 Schläger stationieren</button>`}else h+=`<button class="action primary" data-action="build-menu" data-zone="${z}">🏗️ Gebäude errichten</button>`;if(own){if(t.building_type)h+=`<button class="action danger" data-action="demolish-territory" data-zone="${z}">🧱 Gebäude abreißen · 50 % Erstattung</button>`;if(Number(t.garrison||0)>0)h+=`<button class="action primary" data-action="recall-garrison" data-zone="${z}">↩️ Schläger zurückholen · ${fmt(t.garrison)}</button>`;h+=`<button class="action danger" data-action="leave-territory" data-zone="${z}">🚪 Gebiet verlassen</button>`}drawer('Gebiet',h);$('drawerBody').dataset.zone=z;$('drawerBody').querySelector('[data-action="close"]').onclick=close;$('drawerBody').querySelector('[data-action="build-menu"]')?.addEventListener('click',()=>buildMenu(z))}
window.mtrwBuildMenu=buildMenu;window.mtrwOpenBuildings=window.mtrwOpenBuildings||(()=>{const s=document.createElement('script');s.src='./mafivera-buildings.js?v='+BUILD+'';s.async=false;document.body.appendChild(s);setTimeout(()=>window.mtrwOpenBuildings?.(),50)});
async function demolishTerritory(z){try{if(!confirm('Gebäude wirklich abreißen? Du erhältst 50 % der bisher investierten Baukosten zurück.'))return;const r=await rpc('mafivera_demolish',{p_zone_key:z});await refresh();territory(z);toast('Gebäude abgerissen · '+Number(r?.refund||0).toLocaleString('de-DE')+' $ Erstattung.')}catch(e){toast(e.message||'Gebäude konnte nicht abgerissen werden.',true)}}
async function leaveTerritory(z){try{if(!confirm('Gebiet wirklich verlassen? Gebäude gehen verloren und stationierte Schläger kehren zurück.'))return;const r=await rpc('mafivera_leave_territory',{p_zone_key:z});await refresh();close();toast('Gebiet freigegeben'+(r?.returned_hitmen?' · '+Number(r.returned_hitmen).toLocaleString('de-DE')+' Schläger zurückerhalten.':''))}catch(e){toast(e.message||'Gebiet konnte nicht freigegeben werden.',true)}}
function buildMenu(z){if(world[z]?.owner_id!==uid)return;drawer('Gebäude errichten',`<div class="hint">Pro Feld genau ein Gebäude. Bauzeiten laufen serverseitig weiter.</div><div class="list">${Object.entries(BUILD).map(([k,b])=>`<button class="build-option" data-action="build" data-zone="${z}|${k}"><span>${b.icon}</span><div><b>${b.name}</b><small>${money(b.cost)} · ${b.build}s · ${b.desc}</small></div></button>`).join('')}</div>`)}
async function action(a,z){try{if(a==='close')return close();if(a==='settings'){close();window.mtrwOpenSettings?.();return;}if(a==='claim'){const lat=profile.gps_lat??null,lng=profile.gps_lng??null;if(lat==null||lng==null)return toast('Bitte zuerst GPS aktivieren, um ein Gebiet an deinem Standort zu übernehmen.',true);const c=parse(z);const target=world[z]||{};const targetCell=globalCell(target.center_lat??center(c.r,c.c)[0],target.center_lng??center(c.r,c.c)[1]);const playerCell=globalCell(lat,lng);if(Math.max(Math.abs(playerCell.r-targetCell.r),Math.abs(playerCell.c-targetCell.c))>1)return toast('Du musst auf dem Feld stehen oder direkt neben dem Feld sein.',true);const r=await rpc('mafivera_claim',{p_zone_key:z,p_lat:lat,p_lng:lng,p_count:1});await refresh();toast('Gebiet beansprucht – ohne Schläger.');return}if(a==='claim-remote'){const n=Math.max(1,Math.floor(Number(prompt('Wie viele Schläger entsenden?',String(Math.min(profile.hitmen||1,10))))||0));if(!n)return;try{const r=await rpc('mafivera_claim',{p_zone_key:z,p_lat:null,p_lng:null,p_count:n});await refresh();close();toast(`Marsch gestartet · ${n} Schläger unterwegs.`)}catch(e){toast(String(e?.message||'Gebiet kann nicht mit Schlägern eingenommen werden.').replace(/^Error:\s*/i,''),true)}return}if(a==='attack'){const n=Math.max(1,Math.floor(Number(prompt('Schläger einsetzen',String(Math.min(profile.hitmen||1,10))))||0));const result=await rpc('mafivera_attack',{p_zone_key:z,p_count:n});await refresh();if(result?.captured)toast('Gebiet erobert!');else toast(`Angriff abgewehrt · Verteidigung noch ${fmt(result?.defense_left||0)}`,true);return}if(a==='build'){const [zoneKey,type]=z.split('|');await rpc('mafivera_build',{p_zone_key:zoneKey,p_building_type:type});await refresh();territory(zoneKey);toast('Bau gestartet.');return}if(a==='upgrade'){await rpc('mafivera_upgrade',{p_zone_key:z});await refresh();territory(z);toast('Ausbau gestartet.');return}if(a==='station'){const n=Math.max(1,Math.floor(Number(prompt('Schläger stationieren','1'))||0));await rpc('mafivera_station',{p_zone_key:z,p_count:n});await refresh();territory(z);toast('Schläger stationiert.');return}if(a==='recall-garrison'){const n=Math.max(1,Math.floor(Number(prompt('Wie viele Schläger zurückholen?',String(Math.max(1,Number((world[z]||{}).garrison||1)))) )||0));const stationed=Number((world[z]||{}).garrison||0);if(!stationed)return toast('Keine stationierten Schläger.',true);if(n>stationed)return toast('Nicht genügend stationierte Schläger.',true);const r=await rpc('mafivera_recall',{p_zone_key:z,p_count:n});await refresh();territory(z);toast(`↩️ ${fmt(r?.recalled||n)} Schläger zurück nach Hause.`);return}if(a==='demolish-territory'){await demolishTerritory(z);return}if(a==='leave-territory'){await leaveTerritory(z);return}if(a==='start-drug-production'){const type=$('productionDrug')?.value;if(!type)return toast('Bitte zuerst eine Droge auswählen.',true);const n=Math.max(1,Math.floor(Number($('productionDrugQty')?.value||0)));if(!n)return toast('Bitte eine Produktionsmenge eingeben.',true);await rpc('mtrw_start_production',{p_drug_type:type,p_quantity:n});await refresh();await production();toast(`${n}× ${DRUG_RECIPES[type]?.name||'Droge'} in Produktion.`);return}if(a==='start-weapon-production'){const type=$('productionWeapon')?.value;if(!type)return toast('Bitte zuerst eine Waffe auswählen.',true);const n=Math.max(1,Math.floor(Number($('productionWeaponQty')?.value||0)));if(!n)return toast('Bitte eine Produktionsmenge eingeben.',true);try{await rpc('mtrw_start_production',{p_drug_type:type,p_quantity:n});toast(`${n}× ${WEAPON_RECIPES[type]?.name||'Waffe'} in Produktion.`)}catch(e){return toast(String(e?.message||'Waffenproduktion konnte nicht gestartet werden.').replace(/^Error:\s*/i,''),true)}await refresh();return production()}if(a==='cancel-production'){await rpc('mtrw_cancel_production',{p_job_id:z});await refresh();await production();toast('Produktion abgebrochen und Ressourcen zurückerstattet.');return}if(a==='sell'){const n=Math.max(1,Math.floor(Number(prompt(`Produkte verkaufen (max. ${profile.product||0})`,String(profile.product||0)))||0));if(n){await rpc('mafivera_sell_products',{p_count:n});await refresh();business();toast(`${n} Produkte verkauft.`)}return}if(a==='create-family'){const hasHQ=Object.values(world).some(x=>x?.owner_id===uid&&x?.building_type==='headquarters');if(!hasHQ)return toast('Für die Gründung einer eigenen Familie benötigst du ein Hauptquartier.',true);const n=prompt('Familienname');if(!n)return;const tag=(prompt('Familien-Tag','MAF')||'MAF').slice(0,6);await rpc('mtrw_family_create',{p_id:crypto.randomUUID(),p_name:n,p_tag:tag,p_description:'Zusammenhalt, Ehre, Familie',p_image_url:null});await refresh();family();toast('Familie gegründet.');return}if(a==='family-list'){const q=await db.from('mtrw_families').select('id,name,tag,level,points,member_cap').order('points',{ascending:false}).limit(50);if(q.error)throw q.error;drawer('Familien',`<div class="list">${(q.data||[]).map(f=>`<div class="row"><span>♜ ${esc(f.name)} [${esc(f.tag)}]</span><button class="mini" data-action="join-family" data-zone="${f.id}">Beitreten</button></div>`).join('')}</div>`);return}if(a==='join-family'){await rpc('mtrw_family_join',{p_family_id:z});family();toast('Familie beigetreten.');return}if(a==='family-promote'){const parts=String(z||'').split('|');const familyId=parts[0],memberId=parts[1],nextRole=parts[2];if(!familyId||!memberId||!nextRole)return toast('Ungültiger Familienrang.',true);await rpc('mtrw_family_set_member_role',{p_family_id:familyId,p_user_id:memberId,p_role:nextRole});await family();toast('⬆️ Familienmitglied wurde befördert.');return}if(a==='donate-family'){const q=await db.from('mtrw_family_members').select('family_id').eq('user_id',uid).single();if(q.error)throw q.error;await rpc('mtrw_family_donate',{p_family_id:q.data.family_id,p_amount:100});await refresh();family();toast('Tagesbeitrag geleistet.');return}if(a==='invite'){const d=await rpc('mtrw_create_invite');const link=location.origin+location.pathname+'?invite='+encodeURIComponent(d.code);try{await navigator.clipboard.writeText(link);toast('Einladungslink kopiert.')}catch(e){prompt('Einladungslink',link)}social();return}if(a==='accept-invite'){await acceptInvite(z);social();return}if(a==='logout'){await db.auth.signOut();location.reload()}}catch(e){toast(e.message||'Aktion fehlgeschlagen',true)}}
async function refresh(){await boot();await loadWorld();}
const DRUG_RECIPES={cocaine:{name:'Kokain',material:25,seconds:15},weed:{name:'Cannabis',material:10,seconds:10},meth:{name:'Methamphetamin',material:40,seconds:20},heroin:{name:'Heroin',material:60,seconds:30}};
const WEAPON_RECIPES={weapon_melee:{name:'Hieb- und Stichwaffen',parts:10,seconds:30,value:300},weapon_handgun:{name:'Handfeuerwaffen',parts:25,seconds:60,value:700},weapon_smg:{name:'Kleine Langwaffen / Maschinenpistolen',parts:50,seconds:120,value:1400},weapon_longarm:{name:'Langwaffen',parts:100,seconds:240,value:2200}};
function productionTime(sec){const s=Math.max(1,Math.round(Number(sec)||0));if(s<60)return s+' Sek.';const m=Math.floor(s/60),r=s%60;return m+' Min.'+(r?' '+String(r).padStart(2,'0')+' Sek.':'')}
function productionJobHtml(j,isWeapon){const recipes=isWeapon?WEAPON_RECIPES:DRUG_RECIPES,r=recipes[j.drug_type]||{name:isWeapon?'Waffe':'Drogenproduktion'},finish=new Date(j.finish_at).getTime();return `<div class="task-card"><div><b>${isWeapon?'🏭':'⚗️'} ${esc(r.name)} · ${fmt(j.quantity)} Stück</b><small>${isWeapon?'Waffenteile':'Material'}: ${fmt(j.material_cost)} · Fertig: <span data-production-countdown data-finish="${finish}">wird berechnet…</span></small></div><button class="mini danger" data-action="cancel-production" data-zone="${j.id}">✖ Abbrechen</button></div>`}
async function production(){
 const lab=Object.values(world).find(x=>x?.owner_id===uid&&x?.building_type==='lab');
 const fac=Object.values(world).find(x=>x?.owner_id===uid&&x?.building_type==='weapon_factory');
 const lr=!!lab&&(!lab.building_finish_at||new Date(lab.building_finish_at)<=new Date());
 const fr=!!fac&&(!fac.building_finish_at||new Date(fac.building_finish_at)<=new Date());
 const profileFactoryReady=Number(profile.weapon_factories||0)>0;
 const weaponReady=fr||profileFactoryReady;
 const labLevel=Number(lab?.building_level||0),factoryLevel=Number(fac?.building_level||0);
 const drugOptions=Object.entries(DRUG_RECIPES).map(([k,r])=>`<option value="${k}">${r.name} · ${r.material} Material/Stück · ${productionTime(r.seconds)}</option>`).join('');
 const weaponOptions=Object.entries(WEAPON_RECIPES).map(([k,r])=>`<option value="${k}" ${weaponReady?'':'disabled'}>${r.name} · ${r.parts} Waffenteile/Stück · ${productionTime(r.seconds)} · ${fmt(r.value)} $</option>`).join('');
 const immediate=`
 <div class="production-card"><h3>⚗️ Drogenproduktion</h3><div class="hint">${lr?'Chemielabor Stufe '+labLevel+' · '+(labLevel*5)+'% Produktionsbonus.':'Ein fertiges Chemielabor wird benötigt.'}</div>
 <div class="production-field"><label for="productionDrug">1. Droge auswählen</label><select id="productionDrug" ${lr?'':'disabled'}><option value="" disabled selected>Bitte Droge auswählen …</option>${drugOptions}</select></div>
 <div class="production-field"><label for="productionDrugQty">2. Menge</label><input id="productionDrugQty" type="number" min="1" value="1" inputmode="numeric" ${lr?'':'disabled'}></div>
 <div id="productionDrugInfo" class="hint"></div><button class="action primary" data-action="start-drug-production" ${lr?'':'disabled'}>⚗️ Drogenproduktion starten</button>
 <h4>Aktive Drogenproduktionen</h4><div class="list"><div class="hint">Aktuelle Produktionen werden im Hintergrund aktualisiert.</div></div></div>
 <div class="production-card"><h3>🏭 Waffenproduktion</h3><div class="hint">${weaponReady?'Waffenfabrik Stufe '+Math.max(1,factoryLevel)+' · '+(Math.max(1,factoryLevel)*5)+'% Produktionsbonus.':'Eine fertige Waffenfabrik wird benötigt.'}</div>
 <div class="production-field"><label for="productionWeapon">1. Waffe auswählen</label><select id="productionWeapon"><option value="" disabled selected>Bitte Waffe auswählen …</option>${weaponOptions.replace(/ disabled/g,'')}</select></div>
 <div class="production-field"><label for="productionWeaponQty">2. Menge</label><input id="productionWeaponQty" type="number" min="1" value="1" inputmode="numeric"></div>
 <div id="productionWeaponInfo" class="hint"></div><button class="action primary" data-action="start-weapon-production">🏭 Waffenproduktion starten</button>
 <h4>Aktive Waffenproduktionen</h4><div class="list"><div class="hint">Aktuelle Produktionen werden im Hintergrund aktualisiert.</div></div></div>`;
 drawer('Produktion',immediate);
 const bindCalc=()=>{
  const ds=$('productionDrug'),dq=$('productionDrugQty'),di=$('productionDrugInfo'),ws=$('productionWeapon'),wq=$('productionWeaponQty'),wi=$('productionWeaponInfo');
  const cd=()=>{const r=DRUG_RECIPES[ds?.value],n=Math.max(1,Math.floor(Number(dq?.value)||1));if(!r||!di)return;dq.value=n;di.textContent=fmt(r.material*n)+' Material benötigt · Produktionszeit '+productionTime(Math.max(1,Math.round(r.seconds*n/(1+0.05*Math.max(0,Math.min(20,labLevel))))))};
  const cw=()=>{const r=WEAPON_RECIPES[ws?.value],n=Math.max(1,Math.floor(Number(wq?.value)||1));if(!r||!wi)return;wq.value=n;wi.textContent=fmt(r.parts*n)+' Waffenteile benötigt · Produktionszeit '+productionTime(Math.max(1,Math.round(r.seconds*n/(1+0.05*Math.max(0,Math.min(20,factoryLevel))))))+' · Verkauf '+fmt(r.value*n)+' $'};
  ds?.addEventListener('change',cd);dq?.addEventListener('input',cd);ws?.addEventListener('change',cw);wq?.addEventListener('input',cw);
 };
 bindCalc();
 if(window.__mtrwOfflineCore?.isOffline())return window.__mtrwOfflineCore.renderProduction?.();
 clearInterval(prodTimer);
 try{await rpc('mtrw_collect_drug_production')}catch(e){}
 try{await rpc('mtrw_collect_weapon_production')}catch(e){}
 try{
  const prof=await rpc('mafivera_bootstrap'),p=prof?.profile||{},slotsPerType=5;
  const [q,labQ,factoryQ]=await Promise.all([
   db.from('mtrw_production_jobs').select('id,drug_type,quantity,material_cost,started_at,finish_at,status,created_at').eq('user_id',p.id).eq('status','running').order('created_at',{ascending:true}),
   db.from('world_territories').select('building_level,building_finish_at').eq('owner_id',p.id).eq('building_type','lab').order('building_level',{ascending:false}).limit(1).maybeSingle(),
   db.from('world_territories').select('building_level,building_finish_at').eq('owner_id',p.id).eq('building_type','weapon_factory').order('building_level',{ascending:false}).limit(1).maybeSingle()
  ]);
  if(q.error)throw q.error;if(labQ.error)throw labQ.error;if(factoryQ.error)throw factoryQ.error;
  const jobs=q.data||[],drugJobs=jobs.filter(j=>!String(j.drug_type||'').toLowerCase().startsWith('weapon_')),weaponJobs=jobs.filter(j=>String(j.drug_type||'').toLowerCase().startsWith('weapon_'));
  const l=Number(labQ.data?.building_level||0),fct=Number(factoryQ.data?.building_level||0),lready=!!labQ.data&&(!labQ.data.building_finish_at||new Date(labQ.data.building_finish_at)<=new Date()),fready=!!factoryQ.data&&(!factoryQ.data.building_finish_at||new Date(factoryQ.data.building_finish_at)<=new Date());
  const ds=$('productionDrug'),dq=$('productionDrugQty'),di=$('productionDrugInfo'),ws=$('productionWeapon'),wq=$('productionWeaponQty'),wi=$('productionWeaponInfo');
  const current=drugJobs.map(j=>productionJobHtml(j,false)).join('')||'<div class="hint">Keine laufende Drogenproduktion.</div>';
  const currentW=weaponJobs.map(j=>productionJobHtml(j,true)).join('')||'<div class="hint">Keine laufende Waffenproduktion.</div>';
  const root=$('drawerBody');if(!root)return;
  root.querySelectorAll('h4')[0]?.nextElementSibling?.replaceChildren(...(()=>{const d=document.createElement('div');d.innerHTML=current;return [...d.childNodes]})());
  root.querySelectorAll('h4')[1]?.nextElementSibling?.replaceChildren(...(()=>{const d=document.createElement('div');d.innerHTML=currentW;return [...d.childNodes]})());
  if(ds)ds.disabled=!lready;if(ws)ws.disabled=!fready;
 }catch(e){console.warn('MAFIVERA production refresh:',e)}
}async function productionState(){return null}
async function business(){return production()}
function cachedFamilyView(){
 try{
  const raw=localStorage.getItem('mtrw_family_cache_'+uid);if(!raw)return false;
  const x=JSON.parse(raw);if(!x?.family)return false;
  const names=x.names||{},m=x.members||[],f=x.family,roleMap={Anführer:'Don',Vize:'Underboss',Ältester:'Consigliere',Mitglied:'Soldat'};
  const me=m.find(z=>z.user_id===uid),canPromote=me?.role==='Anführer'||uid===f.owner_id;
  const rows=m.map(z=>{const next=z.role==='Mitglied'?'Ältester':z.role==='Ältester'?'Vize':z.role==='Vize'?'Anführer':null;return `<div class="row family-member-row"><span><b>${esc(names[z.user_id]||z.user_id?.slice(0,8)||'Spieler')}</b><small>♜ ${esc(roleMap[z.role]||'Soldat')} · ${fmt(z.family_points||0)} Punkte</small></span>${canPromote&&z.user_id!==uid&&next?`<button class="mini" data-action="family-promote" data-zone="${esc(f.id+'|'+z.user_id+'|'+next)}">⬆️ Befördern</button>`:''}</div>`}).join('');
  const berlinToday=new Intl.DateTimeFormat('de-DE',{timeZone:'Europe/Berlin',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const lastDonation=me?.last_donation_at?new Intl.DateTimeFormat('de-DE',{timeZone:'Europe/Berlin',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(me.last_donation_at)):'';
  const donatedToday=!!lastDonation&&lastDonation===berlinToday;
  drawer('Familie',`<div class="hero"><span class="hero-icon">♜</span><div><b>${esc(f.name)} [${esc(f.tag)}]</b><p>Level ${f.level} · ${fmt(f.points)} Punkte · ${fmt(f.treasury)} $ Kasse</p></div></div><div class="statgrid"><div><b>${m.length}</b><small>Mitglieder</small></div><div><b>${f.member_cap}</b><small>Kapazität</small></div><div><b>${f.wins}</b><small>Siege</small></div></div><div class="hint">Familienränge: <b>Don</b> · <b>Underboss</b> · <b>Consigliere</b> · <b>Soldat</b></div><button class="action" data-action="donate-family" ${donatedToday?'disabled':''}>${donatedToday?'✅ Tagesbeitrag bereits geleistet':'💰 Tagesbeitrag 100 $ → 100 Familienpunkte'}</button><div class="list">${rows}</div>`);
  return true;
 }catch(_){return false}
}
async function preloadFamilyCache(){
 try{if(!uid||!db)return;const q=await db.from('mtrw_family_members').select('family_id,role,family_points,user_id,last_donation_at').eq('user_id',uid).maybeSingle();if(q.error||!q.data)return;const f=await db.from('mtrw_families').select('*').eq('id',q.data.family_id).single();if(f.error)return;const m=await db.from('mtrw_family_members').select('role,family_points,user_id,last_donation_at').eq('family_id',f.data.id).order('joined_at',{ascending:true});if(m.error)return;const ids=(m.data||[]).map(x=>x.user_id),pp=ids.length?await db.from('profiles').select('id,username,mafia_name').in('id',ids):{data:[]};const names={};(pp.data||[]).forEach(p=>names[p.id]=p.username||p.mafia_name||'Spieler');localStorage.setItem('mtrw_family_cache_'+uid,JSON.stringify({family:f.data,members:m.data||[],names,updated_at:Date.now()}))}catch(_){}
}
async function family(){
  const cacheKey='mtrw_family_cache_'+uid;
  const roleName={Anführer:'Don',Vize:'Underboss',Ältester:'Consigliere',Mitglied:'Soldat'};
  const render=(f,m,names,me,view='dashboard',pending=null)=>{
    const sorted=[...(m||[])].sort((x,y)=>{
      const order={Anführer:0,Vize:1,Ältester:2,Mitglied:3};
      const d=(order[x.role]??9)-(order[y.role]??9);
      return d||String(names[x.user_id]||x.user_id).localeCompare(String(names[y.user_id]||y.user_id),'de',{sensitivity:'base'});
    });
    const isDon=me?.role==='Anführer';
    const count=sorted.length;
    const nav=['dashboard','members'].map(k=>'<button class="mini '+(view===k?'active':'')+'" data-action="family-tab" data-zone="'+k+'">'+(k==='dashboard'?'Übersicht':'Mitglieder')+'</button>').join('');
    let body='';
    if(view==='members'){
      body='<div class="hint">Nur der Don kann Mitglieder rauswerfen oder Ränge ändern. Ein zweiter Don ist technisch ausgeschlossen.</div><div class="list">';
      for(const mbr of sorted){
        const self=mbr.user_id===uid;
        const next=mbr.role==='Mitglied'?'Ältester':mbr.role==='Ältester'?'Vize':mbr.role==='Vize'?'Anführer':null;
        const kick=isDon&&!self?'<button class="mini danger" data-action="family-kick" data-zone="'+esc(mbr.user_id)+'">🚪 Rauswerfen</button>':'';
        const promote=isDon&&!self&&next?'<button class="mini" data-action="family-promote" data-zone="'+esc(f.data.id+'|'+mbr.user_id+'|'+next)+'">'+(next==='Anführer'?'👑 Don vorschlagen':'⬆️ Befördern')+'</button>':'';
        const leave=self?'<button class="mini danger" data-action="family-leave" data-zone="">🚪 Familie verlassen</button>':'';
        body+='<div class="row family-member-row"><span><b>👤 '+esc(names[mbr.user_id]||mbr.user_id.slice(0,8))+'</b><small>♜ '+esc(roleName[mbr.role]||mbr.role)+' · '+fmt(mbr.family_points||0)+' Punkte</small></span><span class="family-rank-actions">'+promote+kick+leave+'</span></div>';
      }
      if(isDon&&pending){
        const targetName=esc(names[pending.to_user_id]||pending.to_user_id?.slice(0,8)||'Spieler');
        body+='<div class="production-card"><h3>👑 Don-Übergabe ausstehend</h3><p>Die Familie soll an <b>'+targetName+'</b> übergeben werden.</p><button class="action primary" data-action="family-confirm-don" data-zone="'+esc(f.data.id)+'">✅ Don-Übergabe bestätigen</button><button class="action" data-action="family-cancel-don" data-zone="'+esc(pending.id)+'">Abbrechen</button></div>';
      }
      body+='</div>';
    }else{
      const last=me?.last_donation_at?new Date(me.last_donation_at):null;
      const berlinToday=new Intl.DateTimeFormat('de-DE',{timeZone:'Europe/Berlin',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
      const donatedToday=!!last&&new Intl.DateTimeFormat('de-DE',{timeZone:'Europe/Berlin',year:'numeric',month:'2-digit',day:'2-digit'}).format(last)===berlinToday;
      const leaveText=isDon&&count>1?'👑 Don kann die Familie erst verlassen, wenn er der einzige verbleibende Spieler ist.':'🚪 Familie verlassen';
      body='<div class="statgrid"><div><b>'+count+'</b><small>Mitglieder</small></div><div><b>'+fmt(f.data.member_cap)+'</b><small>Kapazität</small></div><div><b>'+fmt(f.data.wins)+'</b><small>Siege</small></div></div>'+
        '<div class="hint">Familienränge: <b>Don</b> · <b>Underboss</b> · <b>Consigliere</b> · <b>Soldat</b></div>'+
        '<div class="production-card"><h3>💰 Tagesbeitrag</h3><button class="action '+(donatedToday?'':'primary')+'" data-action="donate-family" '+(donatedToday?'disabled':'')+'>'+(donatedToday?'✅ Tagesbeitrag bereits geleistet':'💰 100 $ spenden → 100 Familienpunkte')+'</button></div>'+
        '<div class="production-card"><h3>👑 Deine Rolle</h3><p><b>'+esc(roleName[me?.role]||me?.role||'Mitglied')+'</b></p>'+
        '<button class="action '+(isDon&&count>1?'':'danger')+'" data-action="family-leave" '+(isDon&&count>1?'disabled':'')+'>'+leaveText+'</button></div>';
      if(isDon&&pending){
        const targetName=esc(names[pending.to_user_id]||pending.to_user_id?.slice(0,8)||'Spieler');
        body+='<div class="production-card"><h3>👑 Don-Übergabe ausstehend</h3><p>Ziel: <b>'+targetName+'</b></p><button class="action primary" data-action="family-confirm-don" data-zone="'+esc(f.data.id)+'">✅ Übergabe bestätigen</button></div>';
      }
    }
    drawer('♜ '+esc(f.data.name)+' ['+esc(f.data.tag)+']','<div class="hero"><span class="hero-icon">♜</span><div><b>'+esc(f.data.name)+'</b><p>Level '+fmt(f.data.level)+' · '+fmt(f.data.points)+' Punkte · '+money(f.data.treasury||0)+' Kasse</p></div></div><div class="tabs family-tabs">'+nav+'</div>'+body);
  };
  try{
    let cached=null;
    try{cached=JSON.parse(localStorage.getItem(cacheKey)||'null')}catch(_){}
    if(cached?.family){
      const me=(cached.members||[]).find(x=>x.user_id===uid)||{};
      render(cached.family,cached.members||[],cached.names||{},me,'dashboard',null);
    }else{
      drawer('Familie','<div class="hero"><span class="hero-icon">♜</span><div><b>Familienübersicht</b><p>Familie, Mitglieder und Ränge.</p></div></div><div class="tabs family-tabs"><button class="mini active">Übersicht</button><button class="mini">Mitglieder</button></div>');
    }
    const q=await db.from('mtrw_family_members').select('family_id,role,family_points,last_donation_at,donated_total').eq('user_id',uid).maybeSingle();
    if(q.error)throw q.error;
    if(!q.data){
      const hq=await db.from('world_territories').select('zone_key').eq('owner_id',uid).eq('building_type','headquarters').limit(1);
      const hasHQ=!hq.error&&(hq.data||[]).length>0;
      drawer('Familie','<div class="hero"><span class="hero-icon">♜</span><div><b>Noch keine Familie</b><p>Gründe deine eigene Familie oder tritt einer bestehenden bei.</p></div></div>'+(hasHQ?'<button class="action primary" data-action="create-family">♜ Familie gründen</button>':'<div class="hint">Für die Gründung einer eigenen Familie wird ein Hauptquartier benötigt.</div>')+'<button class="action" data-action="family-list">👥 Familien suchen</button>');
      return;
    }
    const f=await db.from('mtrw_families').select('*').eq('id',q.data.family_id).single();if(f.error)throw f.error;
    const m=await db.from('mtrw_family_members').select('role,family_points,user_id,last_donation_at,donated_total').eq('family_id',f.data.id).order('joined_at',{ascending:true});if(m.error)throw m.error;
    const ids=(m.data||[]).map(x=>x.user_id);
    const pp=ids.length?await db.from('profiles').select('id,username,mafia_name').in('id',ids):{data:[]};
    const names={};(pp.data||[]).forEach(p=>names[p.id]=p.username||p.mafia_name||'Spieler');
    const pend=await db.from('mtrw_family_leadership_transfers').select('id,to_user_id,from_user_id,created_at').eq('family_id',f.data.id).eq('status','pending').maybeSingle();
    const pending=pend.error?null:pend.data;
    localStorage.setItem(cacheKey,JSON.stringify({family:f.data,members:m.data||[],names,updated_at:Date.now()}));
    render(f.data,m.data||[],names,q.data,'dashboard',pending);
    document.querySelectorAll('#drawerBody [data-action="family-tab"]').forEach(b=>b.onclick=()=>{
      const v=b.dataset.zone||'dashboard';render(f.data,m.data||[],names,q.data,v,pending);
      if(v==='members')bindFamilyActions();
    });
    bindFamilyActions();
  }catch(e){toast(e.message||'Familie konnte nicht geladen werden.',true)}
  function bindFamilyActions(){
    document.querySelectorAll('#drawerBody [data-action]').forEach(b=>{
      if(b.dataset.familyBound)return;
      b.dataset.familyBound='1';
      b.onclick=async()=>{
        const a=b.dataset.action,z=b.dataset.zone||'';
        try{
          if(a==='family-tab'){return family()}
          if(a==='family-kick'){if(!confirm('Dieses Mitglied wirklich aus der Familie entfernen?'))return;await rpc('mtrw_family_remove_member',{p_family_id:JSON.parse(localStorage.getItem(cacheKey)||'{}').family?.id,p_user_id:z});toast('Mitglied wurde aus der Familie entfernt.');return family()}
          if(a==='family-leave'){if(!confirm('Familie wirklich verlassen?'))return;await rpc('mtrw_family_leave',{});toast('Du hast die Familie verlassen.');return family()}
          if(a==='family-confirm-don'){await rpc('mtrw_family_confirm_leadership_transfer',{p_family_id:z});toast('👑 Don-Übergabe bestätigt.');return family()}
          if(a==='family-cancel-don'){await db.from('mtrw_family_leadership_transfers').update({status:'cancelled'}).eq('id',z);toast('Don-Übergabe abgebrochen.');return family()}
        }catch(e){toast(String(e?.message||'Familienaktion fehlgeschlagen').replace(/^Error:\s*/i,''),true)}
      };
    });
  }
}
async function socialProfile(p,back='friends'){
  const s=await rpc('mtrw_social_snapshot');
  const friends=s.friends||[],incoming=s.friend_requests_received||[],outgoing=s.friend_requests_sent||[];
  const isFriend=friends.some(x=>x.id===p.id);
  const incomingReq=incoming.find(x=>x.from_user_id===p.id);
  const outgoingReq=outgoing.find(x=>x.to_user_id===p.id);
  const action=isFriend
    ? '<button class="action" disabled>✅ Bereits befreundet</button>'
    : incomingReq
      ? `<button class="action primary" data-social="accept-request" data-id="${esc(incomingReq.id)}">🤝 Freundschaftsanfrage annehmen</button>`
      : outgoingReq
        ? '<button class="action" disabled>⏳ Anfrage ausstehend</button>'
        : `<button class="action primary" data-social="add-friend" data-id="${esc(p.id)}">🤝 Freund hinzufügen</button>`;
  drawer('Spielerprofil',`<div class="player-profile"><div class="player-avatar">👤</div><div><h2>${esc(p.username||'Spieler')}</h2><small>${esc(p.mafia_name||'Keine Familie')}</small></div></div><div class="statgrid"><div><b>${fmt(p.level||0)}</b><small>Level</small></div><div><b>${fmt(p.reputation||0)}</b><small>Reputation</small></div><div><b>${fmt(p.xp||0)}</b><small>XP</small></div></div><div class="list">${action}<button class="action" data-social="back" data-tab="${back}">← Zurück</button></div>`);
  bindSocial();
}
function cachedRankView(){try{const raw=localStorage.getItem('mtrw_rank_cache');if(!raw)return null;const rows=JSON.parse(raw);if(!Array.isArray(rows)||!rows.length)return null;return rows.map((p,i)=>`<button class="rankrow social-player mtrw-rank-card ${p.id===uid?'mtrw-rank-me':''}" data-social="profile" data-back="rank" data-id="${esc(p.id)}" data-user="${esc(p.username||'Spieler')}" data-level="${p.level||0}" data-rep="${p.reputation||0}" data-mafia="${esc(p.mafia_name||'')}" data-xp="${p.xp||0}">
  <span class="mtrw-rank-pos ${i<3?'top':''}">${i===0?'👑':i===1?'🥈':i===2?'🥉':i+1}</span>
  <span class="mtrw-rank-main"><strong>${esc(p.username||'Spieler')}</strong><small>Level ${fmt(p.level)} · ${fmt(p.xp||0)} XP</small></span>
  <span class="mtrw-rank-score"><b>${fmt(p.reputation)}</b><small>⭐ Ruf</small></span>
  <i class="mtrw-rank-arrow">›</i>
</button>`).join('')}catch(_){return null}}
async function preloadRankCache(){try{const q=await db.from('profiles').select('id,username,mafia_name,reputation,level,xp').order('reputation',{ascending:false}).limit(50);if(!q.error)localStorage.setItem('mtrw_rank_cache',JSON.stringify(q.data||[]))}catch(_){}
}
async function renderSocial(tab='friends',prefix=''){
 const q0=String(prefix||'').trim();
 const tabs=`<div class="tabs social-tabs"><button class="mini ${tab==='friends'?'active':''}" data-social="tab" data-tab="friends">👥 Freundeliste</button><button class="mini ${tab==='add'?'active':''}" data-social="tab" data-tab="add">➕ Freunde hinzufügen</button><button class="mini ${tab==='rank'?'active':''}" data-social="tab" data-tab="rank">🏆 Spielerrangliste</button></div>`;
 const shell=tab==='add'?`<div class="production-card"><h3>🔎 Spieler suchen</h3><input id="socialPlayerSearch" type="text" maxlength="24" autocomplete="off" placeholder="Spielername eingeben …" value="${esc(q0)}"></div><div class="social-block"><h3>Suchergebnisse</h3><div class="list">${q0?'':'Spieler suchen'}</div></div><div class="social-block"><h3>Direkte Einladung</h3><button class="action primary" data-social="invite-link">🔗 Freund per Link einladen</button></div>`:
 tab==='rank'?'<div class="social-block"><h3>Spielerrangliste</h3><div class="list">'+(cachedRankView()||'<div class="hint">Aktuelle Spieler nach Reputation</div>')+'</div></div>':
 '<div class="social-block"><h3>Bestätigte Freunde</h3><div class="list"><div class="hint">Freundesliste</div></div></div><div class="social-block"><h3>Freundschaftsanfragen</h3><div class="list"><div class="hint">Anfragen</div></div></div><div class="social-block"><h3>Direkte Einladung</h3><button class="action primary" data-social="invite-link">🔗 Freund per Link einladen</button></div>';
 drawer('Sozial',tabs+shell);bindSocial();
 try{
  const s=await rpc('mtrw_social_snapshot');
  const friends=s.friends||[],incoming=s.friend_requests_received||[],outgoing=s.friend_requests_sent||[];
  let body='';
  if(tab==='friends'){
   body=`<div class="social-block"><h3>Bestätigte Freunde <small>${friends.length}</small></h3><div class="list">${friends.length?friends.map(f=>`<button class="row social-player" data-social="profile" data-back="${tab}" data-id="${esc(f.id)}" data-user="${esc(f.username||'Spieler')}" data-level="${f.level||0}" data-rep="${f.reputation||0}" data-mafia="${esc(f.mafia_name||'')}" data-xp="0"><span>👤 ${esc(f.username||'Spieler')}<small>Level ${fmt(f.level)} · ${fmt(f.reputation)} ⭐</small></span><b>›</b></button>`).join(''):'<div class="hint">Noch keine bestätigten Freunde.</div>'}</div></div>`;
  }else if(tab==='add'){
   let results=[];if(q0){const r=await db.rpc('mtrw_social_player_search',{p_prefix:q0});if(r.error)throw r.error;results=r.data||[];}
   body=`<div class="production-card"><h3>🔎 Spieler suchen</h3><input id="socialPlayerSearch" type="text" maxlength="24" autocomplete="off" placeholder="Spielername eingeben …" value="${esc(q0)}"></div><div class="social-block"><h3>Suchergebnisse</h3><div class="list">${q0?(results.length?results.map(p=>`<button class="row social-player" data-social="profile" data-back="${tab}" data-id="${esc(p.id)}" data-user="${esc(p.username||'Spieler')}" data-level="${p.level||0}" data-rep="${p.reputation||0}" data-mafia="${esc(p.mafia_name||'')}" data-xp="${p.xp||0}"><span>👤 ${esc(p.username||'Spieler')}<small>Level ${fmt(p.level)} · ${fmt(p.reputation)} ⭐</small></span><b>›</b></button>`).join(''):'<div class="hint">Keine Spieler mit diesem Anfang gefunden.</div>'):'<div class="hint">Spieler suchen</div>'}</div></div>`;
   if(incoming.length)body+=`<div class="social-block"><h3>Freundschaftsanfragen <small>${incoming.length}</small></h3><div class="list">${incoming.map(i=>`<div class="row"><span>👤 ${esc(i.username||'Spieler')}<small>Level ${fmt(i.level)} · Anfrage</small></span><button class="mini" data-social="accept-request" data-id="${esc(i.id)}">Annehmen</button><button class="mini danger" data-social="reject-request" data-id="${esc(i.from_user_id)}">Ablehnen</button></div>`).join('')}</div></div>`;
   if(outgoing.length)body+=`<div class="social-block"><h3>Gesendete Anfragen</h3><div class="list">${outgoing.map(i=>`<div class="row"><span>👤 ${esc(i.username||'Spieler')}<small>⏳ Anfrage ausstehend</small></span></div>`).join('')}</div></div>`;
   body+=`<div class="social-block"><h3>Direkte Einladung</h3><button class="action primary" data-social="invite-link">🔗 Freund per Link einladen</button></div>`;
  }else{
   const rank=await db.from('profiles').select('id,username,mafia_name,reputation,level,xp').order('reputation',{ascending:false}).limit(50);if(rank.error)throw rank.error;localStorage.setItem('mtrw_rank_cache',JSON.stringify(rank.data||[]));
   body=`<div class="social-block"><h3>Spielerrangliste</h3><div class="list">${(rank.data||[]).map((p,i)=>`<button class="rankrow social-player mtrw-rank-card ${p.id===uid?'mtrw-rank-me':''}" data-social="profile" data-back="${tab}" data-id="${esc(p.id)}" data-user="${esc(p.username||'Spieler')}" data-level="${p.level||0}" data-rep="${p.reputation||0}" data-mafia="${esc(p.mafia_name||'')}" data-xp="${p.xp||0}">
  <span class="mtrw-rank-pos ${i<3?'top':''}">${i===0?'👑':i===1?'🥈':i===2?'🥉':i+1}</span>
  <span class="mtrw-rank-main"><strong>${esc(p.username||'Spieler')}</strong><small>Level ${fmt(p.level)} · ${fmt(p.xp||0)} XP</small></span>
  <span class="mtrw-rank-score"><b>${fmt(p.reputation)}</b><small>⭐ Ruf</small></span>
  <i class="mtrw-rank-arrow">›</i>
</button>`).join('')}</div></div>`;
  }
  drawer('Sozial',tabs+body);bindSocial();
 }catch(e){toast(e.message||'Sozialmenü konnte nicht geladen werden.',true)}
}
function bindSocial(){
  document.querySelectorAll('#drawerBody [data-social]').forEach(b=>{
    b.onclick=async()=>{
      const a=b.dataset.social;
      try{
        if(a==='tab')return renderSocial(b.dataset.tab||'friends');
        if(a==='back')return renderSocial(b.dataset.tab||'friends');
        if(a==='profile'){
          return socialProfile({id:b.dataset.id,username:b.dataset.user,level:Number(b.dataset.level||0),reputation:Number(b.dataset.rep||0),mafia_name:b.dataset.mafia||'',xp:Number(b.dataset.xp||0)},b.dataset.back||'friends');
        }
        if(a==='add-friend'){await rpc('mtrw_send_friend_invite',{p_user_id:b.dataset.id});toast('Freundschaftsanfrage gesendet.');return renderSocial('add',document.getElementById('socialPlayerSearch')?.value||'')}
        if(a==='accept-request'){await rpc('mtrw_accept_friend_invite',{p_invite_id:b.dataset.id});toast('Freundschaftsanfrage angenommen.');return renderSocial('friends')}
        if(a==='reject-request'){await rpc('mtrw_remove_friend',{p_user_id:b.dataset.id});toast('Freundschaftsanfrage abgelehnt.');return renderSocial('add')}
        if(a==='invite-link'){
          const d=await rpc('mtrw_create_invite'),link=location.origin+location.pathname+'?invite='+encodeURIComponent(d.code);
          try{if(navigator.share)await navigator.share({title:'MAFIVERA',text:'Füge mich bei MAFIVERA als Freund hinzu:',url:link});else{await navigator.clipboard.writeText(link);toast('Einladungslink kopiert.')}}catch(e){try{await navigator.clipboard.writeText(link);toast('Einladungslink kopiert.')}catch(_){prompt('Einladungslink',link)}}
          return;
        }
      }catch(e){toast(e.message||'Aktion fehlgeschlagen',true)}
    };
  });
  const input=document.getElementById('socialPlayerSearch');
  if(input){
    input.oninput=()=>{clearTimeout(input._socialTimer);input._socialTimer=setTimeout(()=>renderSocial('add',input.value),180)};
    input.focus();input.setSelectionRange(input.value.length,input.value.length);
  }
}
async function social(){return renderSocial('friends')}
async function hitmen(){
 drawer('Schläger',`<div class="hero"><span class="hero-icon">👤</span><div><b>${fmt(profile.hitmen)} freie Schläger</b><p>Rekrutierungszentren produzieren automatisch weiter.</p></div></div><div class="statgrid"><div><b>${fmt(profile.recruitment_centers)}</b><small>Zentren</small></div><div><b>${fmt(profile.garrison)}</b><small>Stationiert</small></div><div><b>${fmt(profile.max_hitmen)}</b><small>Kapazität</small></div></div>`);
 try{await refresh()}catch(_){}
 drawer('Schläger',`<div class="hero"><span class="hero-icon">👤</span><div><b>${fmt(profile.hitmen)} freie Schläger</b><p>Rekrutierungszentren produzieren automatisch weiter.</p></div></div><div class="statgrid"><div><b>${fmt(profile.recruitment_centers)}</b><small>Zentren</small></div><div><b>${fmt(profile.garrison)}</b><small>Stationiert</small></div><div><b>${fmt(profile.max_hitmen)}</b><small>Kapazität</small></div></div>`);
}
async function acceptInvite(code){try{await rpc('mtrw_accept_invite',{p_code:code});localStorage.removeItem('mtrw_invite');toast('Freundschaft hergestellt.')}catch(e){toast(e.message,true)}}
async function consumeInvite(){const u=new URL(location.href),code=u.searchParams.get('invite')||localStorage.getItem('mtrw_invite');if(!code)return;if(u.searchParams.has('invite'))localStorage.setItem('mtrw_invite',code);await acceptInvite(code)}
function menu(){drawer('Menü',`<div class="profile-card"><div class="avatar">👤</div><h2>${esc(profile.username||'Spieler')}</h2><p>${esc(profile.mafia_name||'MAFIVERA-Spieler')}</p><div class="statgrid"><div><b>${fmt(profile.level)}</b><small>Level</small></div><div><b>${fmt(profile.reputation)}</b><small>Ruf</small></div><div><b>${fmt(profile.territories)}</b><small>Gebiete</small></div></div><button class="action" data-action="settings">⚙️ Einstellungen</button><button class="action" data-action="logout">🚪 Abmelden</button></div>`)}
function app(){const r=$('gameRoot');r.innerHTML='<div class="mf-app mf-map-only"><header class="mtrw-hud"><button type="button" class="mtrw-hud-player" id="mtrwHudMenu" aria-label="Eigenes Menü öffnen"><span aria-hidden="true">👤</span><strong id="mtrwHudName">Spieler</strong></button><div class="mtrw-hud-level"><div class="mtrw-hud-level-meta"><span id="mtrwHudLevel">Level 1</span><span id="mtrwHudXp">0 / 1.000 XP</span></div><div class="mtrw-hud-track"><div id="mtrwHudProgress" class="mtrw-hud-fill"></div></div></div><div class="mtrw-hud-wallet"><div><small>💵 Bargeld</small><strong id="mtrwHud-cash">0</strong></div><div><small>🏦 Bank</small><strong id="mtrwHud-bank">0</strong></div><div><small>🖤 Schwarzgeld</small><strong id="mtrwHud-black">0</strong></div><div><small>✦ Gold</small><strong id="mtrwHud-gold">0</strong></div></div></header><div class="mf-map-frame"><div id="mfMap" class="mf-map"></div></div><nav class="mtrw-bottom-nav" id="mtrwBottomNav" aria-label="Hauptnavigation"><div class="mtrw-bottom-nav-track" id="mtrwBottomNavTrack"><button type="button" class="mtrw-nav-item" data-nav="overview" aria-label="Übersicht"><span>⌂</span><small>Übersicht</small></button><button type="button" class="mtrw-nav-item active" data-nav="map" aria-current="page" aria-label="Map"><span>🗺️</span><small>Map</small></button><button type="button" class="mtrw-nav-item" data-nav="chat" aria-label="Chat"><span>💬</span><small>Chat</small></button><button type="button" class="mtrw-nav-item" data-nav="storage" aria-label="Lager"><span>📦</span><small>Lager</small></button><button type="button" class="mtrw-nav-item" data-nav="production" aria-label="Produktion"><span>⚙️</span><small>Produktion</small></button><button type="button" class="mtrw-nav-item" data-nav="alliance" aria-label="Allianz"><span>🤝</span><small>Allianz</small></button><button type="button" class="mtrw-nav-item" data-nav="quests" aria-label="Quests"><span>📜</span><small>Quests</small></button></div></nav></div>';const btn=$('mtrwHudMenu');btn?.addEventListener('click',menu);initBottomNavigation();renderHud()}
function initBottomNavigation(){
 const nav=$('mtrwBottomNav'),track=$('mtrwBottomNavTrack');if(!nav||!track)return;
 track.querySelectorAll('[data-nav]').forEach(button=>button.addEventListener('click',()=>{
  if(track.dataset.dragged==='1'){track.dataset.dragged='0';return}
  const key=button.dataset.nav;
  track.querySelectorAll('[data-nav]').forEach(item=>{const active=item===button;item.classList.toggle('active',active);if(active)item.setAttribute('aria-current','page');else item.removeAttribute('aria-current')});
  window.dispatchEvent(new CustomEvent('mtrw:navigate',{detail:{section:key}}));
  if(key==='map')close();else toast('Bereich „'+button.querySelector('small').textContent+'“ wird vorbereitet.');
 }));
 let down=false,startX=0,scrollLeft=0,moved=false;
 track.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button!==0)return;down=true;moved=false;startX=e.clientX;scrollLeft=track.scrollLeft;track.setPointerCapture?.(e.pointerId)});
 track.addEventListener('pointermove',e=>{if(!down)return;const dx=e.clientX-startX;if(Math.abs(dx)>5)moved=true;if(moved){track.scrollLeft=scrollLeft-dx;track.dataset.dragged='1'}});
 const end=()=>{if(!down)return;down=false;if(!moved)track.dataset.dragged='0'};
 track.addEventListener('pointerup',end);track.addEventListener('pointercancel',end);track.addEventListener('lostpointercapture',end);
}
async function main(){db=window.db;if(!db)throw Error('Supabase nicht geladen');const s=await db.auth.getSession();if(!s.data.session)throw Error('Keine Sitzung');uid=s.data.session.user.id;/* Load the signed-in player's public profile for the HUD only. */try{const pr=await db.from('profiles').select('*').eq('id',uid).maybeSingle();if(!pr.error&&pr.data)sync(pr.data)}catch(e){console.warn('HUD-Profil konnte nicht geladen werden',e)}/* MAP-ONLY MODE: do not bootstrap legacy economy, territory ownership, family, ranks or cached world state. */app();initMap();requestAnimationFrame(()=>map?.invalidateSize({pan:false,animate:false}));setTimeout(()=>map?.invalidateSize({pan:false,animate:false}),500);startGps();}
main().catch(e=>{console.error(e);const root=$('gameRoot');if(root)root.innerHTML='<div style="padding:30px;color:#fff;font-family:system-ui"><h2>MAFIVERA konnte nicht gestartet werden.</h2><p>'+esc(e.message||e)+'</p></div>'});
const playerStyle=document.createElement('style');playerStyle.textContent='.mtrw-player-marker{background:transparent!important;border:0!important}.mtrw-player-marker-pulse{position:absolute;inset:0;border:2px solid #7dc7ff;border-radius:50%;background:#2995ff33;box-shadow:0 0 0 4px #2995ff22,0 0 16px #2995ff99}.mtrw-player-marker-core{position:absolute;left:9px;top:9px;width:12px;height:12px;border:3px solid #fff;border-radius:50%;background:#168cff;box-shadow:0 1px 7px #000b}';document.head.appendChild(playerStyle);const nearbyStyle=document.createElement('style');nearbyStyle.textContent='.mtrw-nearby-player-icon{background:transparent!important;border:0!important;box-shadow:none!important;overflow:visible!important}.mtrw-nearby-player-icon:before,.mtrw-nearby-player-icon:after{display:none!important}.mtrw-nearby-player-icon .mtrw-np-wrap{position:relative!important;width:20px!important;height:20px!important;overflow:visible!important;background:transparent!important;border:0!important;box-shadow:none!important}.mtrw-nearby-player-icon .mtrw-np-dot{position:absolute!important;left:2px!important;top:2px!important;width:16px!important;height:16px!important;border-radius:50%!important;background:#ef4444!important;border:2px solid #fff!important;box-shadow:0 0 0 3px #ef444455,0 1px 8px #000b!important;box-sizing:border-box!important}.mtrw-nearby-player-icon .mtrw-np-label{position:absolute!important;left:50%!important;transform:translateX(-50%)!important;white-space:nowrap!important;padding:0!important;margin:0!important;border:0!important;border-radius:0!important;background:transparent!important;color:#fff!important;font:600 11px/12px system-ui,sans-serif!important;letter-spacing:0!important;text-shadow:0 1px 3px #000,0 0 5px #000!important;box-shadow:none!important;pointer-events:none!important;z-index:1000!important}';document.head.appendChild(nearbyStyle);
window.addEventListener('mtrw:heist-cells-updated',()=>{if(typeof renderGrid==='function')renderGrid()});window.addEventListener('mtrw:march-finished',async e=>{try{await loadWorld();const r=e.detail?.result;if(r?.captured)toast('⚔️ Gebiet erfolgreich erobert! Das Gebiet gehört jetzt dir.');else if(r?.success===false&&r?.defense_left!=null)toast(`⚔️ Angriff beendet · Verteidigung noch ${fmt(r.defense_left)}`,true)}catch(_){}});})();
const mtrwSocialRankStyle=document.createElement('style');mtrwSocialRankStyle.textContent=`
.mtrw-rank-card{position:relative!important;display:grid!important;grid-template-columns:42px minmax(0,1fr) auto 18px!important;align-items:center!important;gap:10px!important;width:100%!important;min-height:72px!important;padding:10px 10px!important;margin:0!important;border:1px solid #283340!important;border-radius:15px!important;background:linear-gradient(135deg,#111821,#0b1016)!important;color:#fff!important;text-align:left!important;box-shadow:0 5px 16px rgba(0,0,0,.22)!important;transition:transform .15s ease,border-color .15s ease!important}.mtrw-rank-card:active{transform:scale(.985)!important}.mtrw-rank-card.mtrw-rank-me{border-color:#d6ad2d!important;box-shadow:0 0 0 1px #d6ad2d33,0 6px 20px #0005!important}.mtrw-rank-pos{display:flex!important;align-items:center!important;justify-content:center!important;width:38px!important;height:38px!important;border-radius:12px!important;background:#151d27!important;color:#9ba7b6!important;font-size:17px!important;font-weight:800!important}.mtrw-rank-pos.top{font-size:22px!important;background:#1b2028!important}.mtrw-rank-main{min-width:0!important;display:flex!important;flex-direction:column!important;gap:3px!important}.mtrw-rank-main strong{font-size:16px!important;line-height:20px!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;color:#f5f7fa!important}.mtrw-rank-main small{font-size:10px!important;line-height:14px!important;color:#7f8b9b!important}.mtrw-rank-score{display:flex!important;flex-direction:column!important;align-items:flex-end!important;gap:2px!important;min-width:60px!important}.mtrw-rank-score b{font-size:15px!important;line-height:18px!important;color:#e8c34b!important}.mtrw-rank-score small{font-size:9px!important;color:#778394!important}.mtrw-rank-arrow{font-style:normal!important;font-size:24px!important;color:#8793a2!important}.social-tabs{position:sticky!important;top:0!important;z-index:25!important;background:#0a0f15f5!important;padding:4px 0 10px!important;backdrop-filter:blur(10px)!important}.social-tabs .mini{min-height:40px!important;font-size:11px!important}.social-tabs .mini.active{border-color:#d6ad2d!important;color:#f3d15b!important;background:#171a1d!important}.mf-drawer .social-block>h3{font-size:15px!important;margin:14px 2px 8px!important}.mf-drawer .social-block .list{display:flex!important;flex-direction:column!important;gap:7px!important}`;document.head.appendChild(mtrwSocialRankStyle);
const hudStyle=document.createElement('style');hudStyle.textContent='.mtrw-hud{position:relative!important;z-index:1200!important;display:flex!important;flex-direction:column!important;justify-content:center!important;gap:5px!important;width:100%!important;height:150px!important;min-height:150px!important;max-height:150px!important;flex:0 0 150px!important;box-sizing:border-box!important;overflow:hidden!important;padding:7px 14px 8px!important;margin:0!important;background:linear-gradient(180deg,#111b2d 0%,#0c1422 100%)!important;color:#f3f6fc!important;border-bottom:1px solid #33445f!important;font-family:system-ui,sans-serif!important}.mtrw-hud-player{display:flex!important;align-items:center!important;gap:7px!important;align-self:flex-start!important;width:100%!important;min-width:0!important;max-width:100%!important;height:26px!important;min-height:26px!important;max-height:26px!important;padding:0!important;margin:0!important;background:transparent!important;border:0!important;color:#f4f6fb!important;font:700 17px/24px system-ui,sans-serif!important;text-align:left!important;overflow:hidden!important}.mtrw-hud-player span{font-size:18px!important;line-height:22px!important;flex:0 0 auto!important}.mtrw-hud-player strong{display:block!important;min-width:0!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important;font:700 17px/24px system-ui,sans-serif!important}.mtrw-hud-level{display:block!important;width:100%!important;min-width:0!important;margin:0!important;padding:0!important}.mtrw-hud-level-meta{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:8px!important;margin:0 0 4px!important;color:#d9e2f1!important;font:600 11px/14px system-ui,sans-serif!important}.mtrw-hud-track{display:block!important;height:6px!important;min-height:6px!important;max-height:6px!important;width:100%!important;overflow:hidden!important;border-radius:20px!important;background:#344257!important;box-shadow:inset 0 1px 2px #0008!important}.mtrw-hud-fill{display:block!important;height:6px!important;min-height:6px!important;width:0;border-radius:20px!important;background:linear-gradient(90deg,#2464e8,#55a0ff)!important;transition:width .25s ease!important}.mtrw-hud-wallet{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;align-items:center!important;gap:5px!important;width:100%!important;height:42px!important;min-height:42px!important;max-height:42px!important;margin:0!important;padding:0!important}.mtrw-hud-wallet>div{display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;gap:2px!important;min-width:0!important;height:38px!important;min-height:38px!important;max-height:38px!important;padding:2px!important;margin:0!important;border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important;text-align:center!important;overflow:hidden!important}.mtrw-hud-wallet small{display:block!important;max-width:100%!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important;font:600 9px/11px system-ui,sans-serif!important;color:#b9c7da!important}.mtrw-hud-wallet strong{display:block!important;max-width:100%!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important;font:700 12px/15px system-ui,sans-serif!important;color:#fff!important;font-variant-numeric:tabular-nums!important}.mtrw-hud-wallet>div:nth-child(4) strong{color:#f1c65b!important}@media(max-width:360px){.mtrw-hud{padding-left:9px!important;padding-right:9px!important}.mtrw-hud-wallet{gap:2px!important}.mtrw-hud-wallet small{font-size:8px!important}.mtrw-hud-wallet strong{font-size:10px!important}}';document.head.appendChild(hudStyle);
const navStyle=document.createElement('style');navStyle.textContent=`
.mtrw-bottom-nav{display:flex!important;align-items:center!important;min-width:0!important;min-height:0!important;width:100%!important;height:100%!important;overflow:hidden!important;padding:8px 9px max(8px,env(safe-area-inset-bottom))!important;box-sizing:border-box!important;background:linear-gradient(180deg,#101923,#080d13)!important;border-top:1px solid #273340!important;pointer-events:auto!important}
.mtrw-bottom-nav-track{display:flex!important;align-items:center!important;gap:7px!important;width:100%!important;height:100%!important;min-width:0!important;overflow-x:auto!important;overflow-y:hidden!important;overscroll-behavior-x:contain!important;scrollbar-width:none!important;-webkit-overflow-scrolling:touch!important;touch-action:pan-x!important;cursor:grab!important;user-select:none!important}
.mtrw-bottom-nav-track::-webkit-scrollbar{display:none!important}.mtrw-bottom-nav-track:active{cursor:grabbing!important}
.mtrw-nav-item{display:flex!important;flex:0 0 76px!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;gap:5px!important;height:58px!important;min-height:58px!important;padding:5px 4px!important;border:1px solid transparent!important;border-radius:12px!important;background:transparent!important;color:#8b96a5!important;white-space:nowrap!important;cursor:pointer!important;-webkit-tap-highlight-color:transparent!important}
.mtrw-nav-item>span{font:600 20px/22px system-ui,sans-serif!important}.mtrw-nav-item>small{font:600 10px/13px system-ui,sans-serif!important;color:inherit!important}
.mtrw-nav-item.active{color:#f0cc78!important;background:linear-gradient(180deg,#25231e,#171a1e)!important;border-color:#8e6c35!important;box-shadow:inset 0 0 0 1px #d5a94b22,0 3px 12px #0006!important}
.mtrw-nav-item:focus-visible{outline:2px solid #d5a94b!important;outline-offset:1px!important}
`;document.head.appendChild(navStyle);
