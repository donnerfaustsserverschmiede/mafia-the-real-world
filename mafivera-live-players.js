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
  const icon=(p)=>{const rel=p.relation||'stranger';const cls=rel==='family'?'mtrw-family-player':rel==='ally'?'mtrw-ally-player':rel==='friend'?'mtrw-friend-player':'mtrw-stranger-player';return L.divIcon({className:'mtrw-live-player '+cls,html:'<span>👤</span>',iconSize:[40,30],iconAnchor:[20,15]})};
  if(!document.getElementById('mtrwLivePlayerCSS')){const s=document.createElement('style');s.id='mtrwLivePlayerCSS';s.textContent=`.mtrw-live-player,.mtrw-live-player.leaflet-marker-icon{background:transparent!important;border:0!important;box-shadow:none!important;width:40px!important;height:30px!important;pointer-events:none}.mtrw-live-player span{display:block;width:24px;height:24px;margin:0 auto;border-radius:50%;font-size:18px;line-height:24px;text-align:center;background:transparent;border:0;box-shadow:none}.mtrw-live-player.mtrw-stranger-player span{filter:none}.mtrw-live-player.mtrw-friend-player span{filter:none;background:#f59e0b;border-radius:50%}.mtrw-live-player.mtrw-ally-player span{filter:none;background:#22c55e;border-radius:50%}.mtrw-live-player.mtrw-family-player span{filter:none;background:#a855f7;border-radius:50%}.mtrw-live-player b{display:none}`;document.head.appendChild(s)}
  const render=p=>{
    if(p.user_id===user.id)return;
    const old=markers.get(p.user_id);
    if(old){old.setLatLng([p.lat,p.lng]);const meta=old.__mtrwMeta||{};if(meta.username!==p.username||meta.level!==p.level||meta.relation!==p.relation){old.setIcon(icon(p));old.__mtrwMeta={username:p.username,level:p.level,relation:p.relation}}}
    else {const m=L.marker([p.lat,p.lng],{icon:icon(p),interactive:false}).addTo(map);m.__mtrwMeta={username:p.username,level:p.level,relation:p.relation};markers.set(p.user_id,m)}
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
    const rel=await db.rpc('mtrw_live_player_relations');const relMap=new Map((rel.data||[]).map(x=>[x.user_id,x.relation]));const nearby=(r.data||[]).map(p=>({...p,relation:relMap.get(p.user_id)||'stranger'})).filter(p=>Number.isFinite(Number(p.lat))&&Number.isFinite(Number(p.lng))&&dist(p.lat,p.lng)<=rad);
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