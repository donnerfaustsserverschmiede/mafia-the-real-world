/* MTRW v1.1 - Worldwide real-world map chunks with client cache. */
(async()=>{
  if(!window.db||!window.map)return;
  const map=window.map,oldGrid=window.gridLayer;if(oldGrid)oldGrid.clearLayers();
  const layer=L.layerGroup().addTo(map);
  let places=[],owned=new Map(),selected=null,busy=false,currentChunk=null;
  const state=()=>window.getMtrwState?window.getMtrwState():{};
  const OVERPASS='https://overpass-api.de/api/interpreter';
  const CHUNK=.01; // ~1.1 km latitude-wide; longitude varies by latitude.
  const CACHE_KEY='mtrw_osm_chunks_v2';
  const CACHE_TTL=1000*60*60*24*7;
  const TIERS={property:{label:'Grundstück',influence:1,money:100,rep:5,color:'#5b83b5'},area:{label:'Gebiet',influence:10,money:200,rep:10,color:'#777'},settlement:{label:'Siedlung',influence:50,money:500,rep:20,color:'#4f9b68'},district:{label:'Stadtteil',influence:250,money:1500,rep:40,color:'#d27a32'},city:{label:'Stadt',influence:1000,money:5000,rep:100,color:'#a85b9c'}};
  const tier=k=>{k=String(k||'').toLowerCase();if(k==='city'||k==='town')return'city';if(['suburb','neighbourhood','quarter'].includes(k))return'district';if(['village','hamlet'].includes(k))return'settlement';if(['residential','industrial'].includes(k))return'area';return'property'};
  const esc=s=>String(s??'').replace(/[&<>\'\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;'}[c]));
  const center=e=>e.lat!=null&&e.lon!=null?[e.lat,e.lon]:e.center?[e.center.lat,e.center.lon]:e.geometry?.length?[e.geometry.reduce((a,p)=>a+p.lat,0)/e.geometry.length,e.geometry.reduce((a,p)=>a+p.lon,0)/e.geometry.length]:null;
  const area=a=>{if(!a||a.length<3)return Infinity;let s=0;for(let i=0,j=a.length-1;i<a.length;j=i++)s+=a[j].lat*a[i].lon-a[i].lat*a[j].lon;return Math.abs(s)};
  const chunkKey=(lat,lng)=>`${Math.floor(lat/CHUNK)}:${Math.floor(lng/CHUNK)}`;
  const readCache=()=>{try{return JSON.parse(localStorage.getItem(CACHE_KEY)||'{}')}catch{return{}}};
  const writeCache=c=>{try{const entries=Object.entries(c).sort((a,b)=>(a[1]?.time||0)-(b[1]?.time||0));while(entries.length>32){delete c[entries.shift()[0]]}localStorage.setItem(CACHE_KEY,JSON.stringify(c))}catch{}};
  async function loadOwned(ids){
    if(!ids.length){owned=new Map();return}
    const fresh=new Map();
    for(let i=0;i<ids.length;i+=150){
      const batch=ids.slice(i,i+150),{data,error}=await window.db.from('game_places').select('id,owner_id,tier,influence_value,claim_reward_money,claim_reward_reputation').in('id',batch);
      if(error){console.warn('[MTRW] owned places',error);continue}(data||[]).forEach(x=>fresh.set(x.id,x));
    }
    owned=fresh;
  }
  function normalize(elements){return(elements||[]).map(x=>{const t=x.tags||{},k=tier(t.place||t.building||t.landuse),c=center(x);let g=x.geometry||null;if(!g&&c)g=[{lat:c[0],lon:c[1]}];return{id:`${x.type}/${x.id}`,osmType:x.type,osmId:x.id,name:t.name||TIERS[k].label,kind:t.place||t.building||t.landuse||'area',tier:k,center:c,geometry:g,tags:t}}).filter(x=>x.center)}
  function mergeCached(){const cache=readCache(),out=new Map();for(const v of Object.values(cache)){if(!v||Date.now()-(v.time||0)>CACHE_TTL)continue;for(const p of(v.places||[]))out.set(p.id,p)}places=[...out.values()];return places}
  async function fetchChunk(lat,lng){
    if(!Number.isFinite(lat)||!Number.isFinite(lng)||busy)return;
    const key=chunkKey(lat,lng),cache=readCache(),hit=cache[key];
    currentChunk=key;
    if(hit&&Date.now()-hit.time<CACHE_TTL){mergeCached();await loadOwned(places.map(p=>p.id));draw();selectAt(lat,lng);return}
    const ci=Math.floor(lat/CHUNK),cj=Math.floor(lng/CHUNK),pad=.0012,s=ci*CHUNK-pad,w=cj*CHUNK-pad,n=(ci+1)*CHUNK+pad,e=(cj+1)*CHUNK+pad;
    const q=`[out:json][timeout:8];(way[building](${s},${w},${n},${e});way[landuse~"^(residential|industrial)$"](${s},${w},${n},${e});way[place~"^(neighbourhood|suburb|quarter|village|hamlet|town|city)$"](${s},${w},${n},${e});relation[place~"^(neighbourhood|suburb|quarter|village|hamlet|town|city)$"](${s},${w},${n},${e});node[place~"^(neighbourhood|suburb|quarter|village|hamlet|town|city)$"](${s},${w},${n},${e}););out center geom;`;
    busy=true;
    try{
      const r=await fetch(OVERPASS,{method:'POST',body:'data='+encodeURIComponent(q),signal:AbortSignal.timeout(9000)});if(!r.ok)throw Error('overpass');
      const j=await r.json();cache[key]={time:Date.now(),places:normalize(j.elements)};writeCache(cache);mergeCached();
      await loadOwned(places.map(p=>p.id));draw();selectAt(lat,lng);
      const st=document.getElementById('status');if(st)st.textContent=`Kartendaten aktiv · ${places.length} Objekte in der Umgebung`;
    }catch(e){
      console.warn('[MTRW] map chunk load failed',e);mergeCached();draw();selectAt(lat,lng);
      const st=document.getElementById('status');if(st&&places.length===0)st.textContent='Kartendaten werden im Hintergrund geladen…';
    }finally{busy=false}
  }
  function draw(){layer.clearLayers();for(const p of places){const o=owned.get(p.id),own=!!o,c=own?'#d1a72c':TIERS[p.tier].color;let l;if(p.geometry?.length>=3)l=L.polygon(p.geometry.map(x=>[x.lat,x.lon]),{color:c,weight:own?3:1,fillColor:c,fillOpacity:own?.30:.10});else l=L.circleMarker(p.center,{radius:p.tier==='city'?10:p.tier==='district'?8:p.tier==='settlement'?7:5,color:c,fillColor:c,fillOpacity:.65,weight:2});l.bindTooltip(`${esc(p.name)} · ${TIERS[p.tier].label}`,{sticky:true});l.on('click',()=>select(p));l.addTo(layer)}}
  function inside(pt,g){if(!g||g.length<3)return false;let x=pt[1],y=pt[0],ok=false;for(let i=0,j=g.length-1;i<g.length;j=i++){let xi=g[i].lon,yi=g[i].lat,xj=g[j].lon,yj=g[j].lat,hit=((yi>y)!=(yj>y))&&x<(xj-xi)*(y-yi)/(yj-yi)+xi;if(hit)ok=!ok}return ok}
  function selectAt(lat,lng){const hits=places.filter(p=>p.geometry?.length>=3&&inside([lat,lng],p.geometry)).sort((a,b)=>area(a.geometry)-area(b.geometry));if(hits[0])select(hits[0]);else{const near=places.filter(p=>p.center).sort((a,b)=>map.distance([lat,lng],a.center)-map.distance([lat,lng],b.center))[0];if(near&&map.distance([lat,lng],near.center)<120)select(near)}}
  function select(p){selected=p;window.current=p.id;const st=state(),o=owned.get(p.id),v=TIERS[p.tier],mine=o?.owner_id===st.user?.id;document.getElementById('zoneTitle').textContent=`${v.label}: ${p.name}`;document.getElementById('zoneInfo').innerHTML=o?(mine?'Dieses Gebiet gehört deiner Mafia-Familie.':'Dieses Gebiet wird von einer rivalisierenden Mafia kontrolliert.'):`<b>${v.influence.toLocaleString('de-DE')} Einfluss</b> · +$${v.money.toLocaleString('de-DE')} · +${v.rep} Reputation`;const b=document.getElementById('claim');if(b)b.disabled=!!o||!st.user}
  window.claimRealPlace=async()=>{const st=state();if(!selected||!st.user)return;const pos=st.marker?.getLatLng();if(!pos){document.getElementById('status').textContent='GPS-Position fehlt.';return}const s=document.getElementById('status');s.textContent='Gebiet wird serverseitig geprüft…';const{data,error}=await window.db.rpc('claim_place',{p_place_id:selected.id,p_osm_type:selected.osmType,p_osm_id:selected.osmId,p_name:selected.name,p_kind:selected.kind,p_lat:pos.lat,p_lng:pos.lng,p_geometry:selected.geometry});if(error){s.textContent=error.message.includes('place_already_owned')?'Dieses Gebiet wurde bereits übernommen.':error.message.includes('not_inside_place')?'Du befindest dich nicht im zulässigen Bereich.':error.message;return}st.profile.money=data.money;st.profile.reputation=data.reputation;owned.set(selected.id,{id:selected.id,owner_id:st.user.id,tier:data.tier,influence_value:data.influence,claim_reward_money:data.reward_money,claim_reward_reputation:data.reward_reputation});draw();select(selected);document.getElementById('money').textContent='$'+Number(data.money).toLocaleString('de-DE');document.getElementById('rep').textContent=data.reputation;document.getElementById('territory').textContent=owned.size;s.textContent=`${TIERS[selected.tier].label} übernommen. +$${Number(data.reward_money).toLocaleString('de-DE')} · +${data.reward_reputation} Reputation · ${data.influence} Einfluss`};
  document.getElementById('claim').onclick=()=>window.claimRealPlace();
  window.updateZoneReal=(lat,lng)=>{selectAt(lat,lng);const key=chunkKey(lat,lng);if(key!==currentChunk&&!busy)fetchChunk(lat,lng)};
  window.loadRealPlaces=fetchChunk;
  const legend=document.createElement('div');legend.style.cssText='position:absolute;top:10px;right:10px;z-index:1200;background:#111d;color:#eee;padding:8px 10px;border:1px solid #444;border-radius:10px;font:11px system-ui;line-height:1.55';legend.innerHTML=Object.entries(TIERS).map(([k,v])=>`<div><span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${v.color};margin-right:5px"></span>${v.label} · ${v.influence} Einfluss</div>`).join('');document.getElementById('map').appendChild(legend);
  if(window.marker){const p=window.marker.getLatLng();fetchChunk(p.lat,p.lng)}
})();

/* Device GPS permission / original device position. */
(()=>{
  if(window.mtrwGpsInstalled)return;
  window.mtrwGpsInstalled=true;
  const game=document.getElementById('game'),button=document.getElementById('locate'),status=document.getElementById('status');
  const setStatus=t=>{if(status)status.textContent=t};
  const originalLocate=window.locate;
  let requested=false;
  function errorText(e){if(!e)return'Unbekannter GPS-Fehler.';if(e.code===1)return'Standortzugriff verweigert. Bitte im Browser für diese Website den Standort erlauben und möglichst „Genauen Standort“ aktivieren.';if(e.code===2)return'Der Gerätestandort konnte nicht ermittelt werden. Prüfe GPS/Standortdienste und versuche es erneut.';if(e.code===3)return'Die GPS-Ermittlung dauert zu lange. Bitte prüfe die Standortdienste und versuche es erneut.';return e.message||'GPS-Fehler.'}
  function requestRealLocation(){if(!navigator.geolocation){setStatus('Dieser Browser unterstützt keinen Gerätestandort.');return}if(typeof originalLocate!=='function'){setStatus('GPS-Modul konnte nicht gestartet werden.');return}setStatus('📍 Originaler Gerätestandort wird angefordert…');navigator.geolocation.getCurrentPosition(pos=>{const a=Math.round(pos.coords.accuracy||0);setStatus(`📍 Gerätestandort aktiv · Genauigkeit ca. ${a} m`);originalLocate()},e=>setStatus(errorText(e)),{enableHighAccuracy:true,maximumAge:0,timeout:20000})}
  async function checkPermission(){try{if(!navigator.permissions?.query)return'unknown';const p=await navigator.permissions.query({name:'geolocation'});if(p.state==='denied')setStatus('📍 Standort ist blockiert. Bitte Standortberechtigung für MAFIA – The Real World im Browser freigeben.');return p.state}catch{return'unknown'}}
  if(button)button.onclick=requestRealLocation;
  async function startWhenGameVisible(){if(requested||!game||game.hidden)return;requested=true;const permission=await checkPermission();if(permission!=='denied')requestRealLocation()}
  if(game){new MutationObserver(startWhenGameVisible).observe(game,{attributes:true,attributeFilter:['hidden']});setTimeout(startWhenGameVisible,700)}
})();
