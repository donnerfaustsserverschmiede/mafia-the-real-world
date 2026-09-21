(()=>{'use strict';
if(window.__mtrwLivePlayers)return;window.__mtrwLivePlayers=true;
const boot=async()=>{
  if(!window.db||!window.__mtrwMap||!window.L||!navigator.geolocation)return;
  const db=window.db,map=window.__mtrwMap;
  const {data:{user}}=await db.auth.getUser(); if(!user)return;
  const markers=new Map(); let watchId=null;
  const upsert=async(pos)=>{
    const lat=pos.coords.latitude,lng=pos.coords.longitude;
    let username='Spieler',level=0,alliance_id=null;
    try{const r=await db.from('profiles').select('username,level').eq('id',user.id).maybeSingle();if(r.data){username=r.data.username||username;level=r.data.level||0}const a=await db.from('mtrw_alliance_members').select('alliance_id').eq('user_id',user.id).maybeSingle();if(a.data)alliance_id=a.data.alliance_id;}catch(e){}
    await db.from('mtrw_live_players').upsert({user_id:user.id,username,lat,lng,level,alliance_id,updated_at:new Date().toISOString()});
  };
  const icon=(p,self=false)=>{const allied=alliance_id&&p.alliance_id&&alliance_id===p.alliance_id;return L.divIcon({className:'mtrw-live-player '+(allied?'mtrw-allied-player':''),html:'<span>👤</span>',iconSize:[40,30],iconAnchor:[20,15]})};
  if(!document.getElementById('mtrwLivePlayerCSS')){const s=document.createElement('style');s.id='mtrwLivePlayerCSS';s.textContent=`.mtrw-live-player,.mtrw-live-player.leaflet-marker-icon{background:transparent!important;border:0!important;box-shadow:none!important;width:40px!important;height:30px!important;pointer-events:none}.mtrw-live-player span{display:block;width:24px;height:24px;margin:0 auto;border-radius:50%;font-size:18px;line-height:24px;text-align:center;background:transparent;border:0;box-shadow:none}.mtrw-live-player.mtrw-allied-player span{filter:sepia(1) saturate(8) hue-rotate(350deg) brightness(1.1)}.mtrw-live-player b{display:none}`;document.head.appendChild(s)}
  const render=p=>{
    if(p.user_id===user.id)return;
    const old=markers.get(p.user_id);
    if(old){old.setLatLng([p.lat,p.lng]);const meta=old.__mtrwMeta||{};if(meta.username!==p.username||meta.level!==p.level||meta.alliance_id!==p.alliance_id){old.setIcon(icon(p));old.__mtrwMeta={username:p.username,level:p.level,alliance_id:p.alliance_id}}}
    else {const m=L.marker([p.lat,p.lng],{icon:icon(p),interactive:false}).addTo(map);m.__mtrwMeta={username:p.username,level:p.level,alliance_id:p.alliance_id};markers.set(p.user_id,m)}
  };
  const removeStale=rows=>{
    const active=new Set(rows.map(p=>p.user_id));
    markers.forEach((m,id)=>{if(!active.has(id)){map.removeLayer(m);markers.delete(id)}})
  };
  const load=async()=>{
    const cutoff=new Date(Date.now()-30000).toISOString();
    const r=await db.from('mtrw_live_players').select('*').gte('updated_at',cutoff);
    if(r.error)return;
    const me=window.__mtrwProfile;
    if(!me||!Number.isFinite(Number(me.gps_lat))||!Number.isFinite(Number(me.gps_lng))){removeStale([]);return;}
    const lat1=Number(me.gps_lat),lng1=Number(me.gps_lng),rad=500;
    const dist=(lat2,lng2)=>{const R=6371000,a=(Number(lat2)-lat1)*Math.PI/180,b=(Number(lng2)-lng1)*Math.PI/180;const x=Math.sin(a/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(Number(lat2)*Math.PI/180)*Math.sin(b/2)**2;return R*2*Math.asin(Math.sqrt(x));};
    const nearby=(r.data||[]).filter(p=>Number.isFinite(Number(p.lat))&&Number.isFinite(Number(p.lng))&&dist(p.lat,p.lng)<=rad);
    removeStale(nearby); nearby.forEach(render);
  };
  watchId=navigator.geolocation.watchPosition(upsert,()=>{}, {enableHighAccuracy:true,maximumAge:5000,timeout:15000});
  const channel=db.channel('mtrw-live-players').on('postgres_changes',{event:'*',schema:'public',table:'mtrw_live_players'},()=>load()).subscribe();
  await load();
  setInterval(load,10000);
  window.addEventListener('beforeunload',()=>{if(watchId!==null)navigator.geolocation.clearWatch(watchId);db.from('mtrw_live_players').delete().eq('user_id',user.id).then(()=>{})});
};
const s=setInterval(()=>{if(window.db&&window.__mtrwMap){clearInterval(s);boot()}},500);
})();