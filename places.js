/* MTRW Global World Map v3
   GPS remains live and independent. OSM data is requested only through the
   Supabase world-tile service and cached per global Web-Mercator tile.
*/
(async()=>{
  if(window.mtrwWorldMapInstalled||!window.db||!window.map)return;
  window.mtrwWorldMapInstalled=true;
  const map=window.map,oldGrid=window.gridLayer;if(oldGrid)oldGrid.clearLayers();
  const layer=L.layerGroup().addTo(map);
  const TILE_Z=14,CACHE_KEY='mtrw_world_tiles_v3',CACHE_TTL=1000*60*60*24*7,MAX_LOCAL_TILES=48;
  const TILE_ENDPOINT='https://ufqdntsxgqcxtszufbtv.supabase.co/functions/v1/world-tile';
  let places=[],owned=new Map(),selected=null,currentTile=null,loading=new Set();
  const state=()=>window.getMtrwState?window.getMtrwState():{};
  const TIERS={property:{label:'Grundstück',influence:1,money:100,rep:5,color:'#5b83b5'},area:{label:'Gebiet',influence:10,money:200,rep:10,color:'#777'},settlement:{label:'Siedlung',influence:50,money:500,rep:20,color:'#4f9b68'},district:{label:'Stadtteil',influence:250,money:1500,rep:40,color:'#d27a32'},city:{label:'Stadt',influence:1000,money:5000,rep:100,color:'#a85b9c'}};
  const tier=k=>{k=String(k||'').toLowerCase();if(k==='city'||k==='town')return'city';if(['suburb','neighbourhood','quarter'].includes(k))return'district';if(['village','hamlet'].includes(k))return'settlement';if(['residential','industrial'].includes(k))return'area';return'property'};
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const area=a=>{if(!a||a.length<3)return Infinity;let s=0;for(let i=0,j=a.length-1;i<a.length;j=i++)s+=a[j].lat*a[i].lon-a[i].lat*a[j].lon;return Math.abs(s)};
  function tile(lat,lng){const n=2**TILE_Z;return{z:TILE_Z,x:Math.max(0,Math.min(n-1,Math.floor((lng+180)/360*n))),y:Math.max(0,Math.min(n-1,Math.floor((1-Math.asinh(Math.tan(lat*Math.PI/180))/Math.PI)/2*n)))}}
  const tileKey=t=>`${t.z}/${t.x}/${t.y}`;
  const readCache=()=>{try{return JSON.parse(localStorage.getItem(CACHE_KEY)||'{}')}catch{return{}}};
  function writeCache(c){try{const entries=Object.entries(c).sort((a,b)=>(a[1]?.time||0)-(b[1]?.time||0));while(entries.length>MAX_LOCAL_TILES)delete c[entries.shift()[0]];localStorage.setItem(CACHE_KEY,JSON.stringify(c))}catch{}}
  function normalize(raw){return(raw||[]).map(x=>{const c=x.center||null,g=Array.isArray(x.geometry)?x.geometry:null,k=tier(x.kind);return{id:x.id,osmType:x.osm_type,osmId:Number(x.osm_id),name:x.name||TIERS[k].label,kind:x.kind||'area',tier:k,center:c?[Number(c.lat),Number(c.lon)]:null,geometry:g,tags:x.tags||{}}}).filter(x=>x.center&&Number.isFinite(x.center[0])&&Number.isFinite(x.center[1]))}
  function mergeCache(){const c=readCache(),out=new Map();for(const v of Object.values(c)){if(!v||Date.now()-(v.time||0)>CACHE_TTL)continue;for(const p of(v.places||[]))out.set(p.id,p)}places=[...out.values()]}
  async function loadOwned(){const ids=places.map(p=>p.id);if(!ids.length){owned=new Map();return}const fresh=new Map();for(let i=0;i<ids.length;i+=200){const{data,error}=await window.db.from('game_places').select('id,owner_id,tier,influence_value,claim_reward_money,claim_reward_reputation').in('id',ids.slice(i,i+200));if(!error)(data||[]).forEach(x=>fresh.set(x.id,x))}owned=fresh}
  async function requestAt(lat,lng){
    const t=tile(lat,lng),key=tileKey(t),cache=readCache();currentTile=key;
    if(cache[key]&&Date.now()-cache[key].time<CACHE_TTL){mergeCache();await loadOwned();draw();selectAt(lat,lng);prefetchNeighbours(t);return}
    if(loading.has(key))return;
    loading.add(key);
    try{
      const session=(await window.db.auth.getSession()).data.session;if(!session)throw Error('no_session');
      const r=await fetch(TILE_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+session.access_token,'apikey':typeof SUPABASE_PUBLISHABLE_KEY!=='undefined'?SUPABASE_PUBLISHABLE_KEY:''},body:JSON.stringify({lat,lng})});
      if(!r.ok)throw Error('world_tile_'+r.status);
      const j=await r.json(),raw=Array.isArray(j.osm_data)?j.osm_data:[];
      const c=readCache();c[key]={time:Date.now(),places:normalize(raw)};writeCache(c);mergeCache();await loadOwned();draw();selectAt(lat,lng);
      const st=document.getElementById('status');if(st)st.textContent=`🌍 Weltkarte aktiv · ${places.length} Objekte im lokalen Cache`;
      prefetchNeighbours(t);
    }catch(e){console.warn('[MTRW] world tile load failed',e);mergeCache();draw();selectAt(lat,lng);const st=document.getElementById('status');if(st&&places.length===0)st.textContent='🌍 Kartenbereich wird im Hintergrund geladen…'}
    finally{loading.delete(key)}
  }
  function prefetchNeighbours(t){const n=2**TILE_Z,jobs=[];for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++){if(dx===0&&dy===0)continue;const x=t.x+dx;if(x<0||x>=n)continue;const y=t.y+dy;if(y<0||y>=n)continue;const lon=(x+.5)/n*360-180,lat=Math.atan(Math.sinh(Math.PI*(1-2*(y+.5)/n)))*180/Math.PI;jobs.push([lat,lon])}setTimeout(()=>jobs.slice(0,2).forEach(([lat,lng])=>requestAt(lat,lng)),250)}
  function draw(){layer.clearLayers();for(const p of places){const o=owned.get(p.id),own=!!o,c=own?'#d1a72c':TIERS[p.tier].color;let l;if(p.geometry?.length>=3)l=L.polygon(p.geometry.map(x=>[x.lat,x.lon]),{color:c,weight:own?3:1,fillColor:c,fillOpacity:own?.30:.10});else l=L.circleMarker(p.center,{radius:p.tier==='city'?10:p.tier==='district'?8:p.tier==='settlement'?7:5,color:c,fillColor:c,fillOpacity:.65,weight:2});l.bindTooltip(`${esc(p.name)} · ${TIERS[p.tier].label}`,{sticky:true});l.on('click',()=>select(p));l.addTo(layer)}}
  function inside(pt,g){if(!g||g.length<3)return false;let x=pt[1],y=pt[0],ok=false;for(let i=0,j=g.length-1;i<g.length;j=i++){const xi=g[i].lon,yi=g[i].lat,xj=g[j].lon,yj=g[j].lat,hit=((yi>y)!=(yj>y))&&x<(xj-xi)*(y-yi)/(yj-yi)+xi;if(hit)ok=!ok}return ok}
  function selectAt(lat,lng){const hits=places.filter(p=>p.geometry?.length>=3&&inside([lat,lng],p.geometry)).sort((a,b)=>area(a.geometry)-area(b.geometry));if(hits[0])select(hits[0]);else{const near=places.filter(p=>p.center).sort((a,b)=>map.distance([lat,lng],a.center)-map.distance([lat,lng],b.center))[0];if(near&&map.distance([lat,lng],near.center)<120)select(near)}}
  function select(p){selected=p;window.current=p.id;const st=state(),o=owned.get(p.id),v=TIERS[p.tier],mine=o?.owner_id===st.user?.id;document.getElementById('zoneTitle').textContent=`${v.label}: ${p.name}`;document.getElementById('zoneInfo').innerHTML=o?(mine?'Dieses Gebiet gehört deiner Mafia-Familie.':'Dieses Gebiet wird von einer rivalisierenden Mafia kontrolliert.'):`<b>${v.influence.toLocaleString('de-DE')} Einfluss</b> · +$${v.money.toLocaleString('de-DE')} · +${v.rep} Reputation`;const b=document.getElementById('claim');if(b)b.disabled=!!o||!st.user}
  window.claimRealPlace=async()=>{const st=state();if(!selected||!st.user)return;const pos=st.marker?.getLatLng();if(!pos){document.getElementById('status').textContent='GPS-Position fehlt.';return}const s=document.getElementById('status');s.textContent='Gebiet wird serverseitig geprüft…';const{data,error}=await window.db.rpc('claim_place',{p_place_id:selected.id,p_osm_type:selected.osmType,p_osm_id:selected.osmId,p_name:selected.name,p_kind:selected.kind,p_lat:pos.lat,p_lng:pos.lng,p_geometry:selected.geometry});if(error){const m=error.message||'';s.textContent=m.includes('place_already_owned')?'Dieses Gebiet wurde bereits übernommen.':m.includes('not_inside_place')?'Du befindest dich nicht im zulässigen Bereich.':m;return}st.profile.money=data.money;st.profile.reputation=data.reputation;owned.set(selected.id,{id:selected.id,owner_id:st.user.id,tier:data.tier,influence_value:data.influence,claim_reward_money:data.reward_money,claim_reward_reputation:data.reward_reputation});draw();select(selected);document.getElementById('money').textContent='$'+Number(data.money).toLocaleString('de-DE');document.getElementById('rep').textContent=data.reputation;document.getElementById('territory').textContent=owned.size;s.textContent=`${TIERS[selected.tier].label} übernommen. +$${Number(data.reward_money).toLocaleString('de-DE')} · +${data.reward_reputation} Reputation · ${data.influence} Einfluss`};
  document.getElementById('claim').onclick=()=>window.claimRealPlace();
  window.updateZoneReal=(lat,lng)=>{selectAt(lat,lng);const k=tileKey(tile(lat,lng));if(k!==currentTile)requestAt(lat,lng)};
  window.loadRealPlaces=requestAt;
  const legend=document.createElement('div');legend.style.cssText='position:absolute;top:10px;right:10px;z-index:1200;background:#111d;color:#eee;padding:8px 10px;border:1px solid #444;border-radius:10px;font:11px system-ui;line-height:1.55';legend.innerHTML=Object.entries(TIERS).map(([k,v])=>`<div><span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${v.color};margin-right:5px"></span>${v.label} · ${v.influence} Einfluss</div>`).join('');document.getElementById('map').appendChild(legend);
  const st=state(),initialMarker=st.marker;
  if(initialMarker){const p=initialMarker.getLatLng();requestAt(p.lat,p.lng)}
})();
