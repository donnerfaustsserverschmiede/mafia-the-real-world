(()=>{'use strict';
if(window.__mtrwLivePlayers)return;window.__mtrwLivePlayers=true;
const boot=async()=>{
  if(!window.db||!window.__mtrwMap||!window.L||!navigator.geolocation)return;
  const db=window.db,map=window.__mtrwMap;
  const {data:{user}}=await db.auth.getUser(); if(!user)return;
  const markers=new Map(); let watchId=null;
  const upsert=async(pos)=>{
    const lat=pos.coords.latitude,lng=pos.coords.longitude;
    let username='Spieler',level=0;
    try{const r=await db.from('profiles').select('username,level').eq('id',user.id).maybeSingle();if(r.data){username=r.data.username||username;level=r.data.level||0}}catch(e){}
    await db.from('mtrw_live_players').upsert({user_id:user.id,username,lat,lng,level,updated_at:new Date().toISOString()});
  };
  const icon=(p,self=false)=>L.divIcon({className:'mtrw-live-player',html:'<span>👤</span>',iconSize:[40,30],iconAnchor:[20,15]});
  if(!document.getElementById('mtrwLivePlayerCSS')){const s=document.createElement('style');s.id='mtrwLivePlayerCSS';s.textContent=`.mtrw-live-player,.mtrw-live-player.leaflet-marker-icon{background:transparent!important;border:0!important;box-shadow:none!important;width:40px!important;height:30px!important;pointer-events:none}.mtrw-live-player span{display:block;width:24px;height:24px;margin:0 auto;border-radius:50%;font-size:18px;line-height:24px;text-align:center;background:transparent;border:0;box-shadow:none}.mtrw-live-player b{display:none}`;document.head.appendChild(s)}
  const render=p=>{
    if(p.user_id===user.id)return;
    const old=markers.get(p.user_id);
    if(old){old.setLatLng([p.lat,p.lng]);const meta=old.__mtrwMeta||{};if(meta.username!==p.username||meta.level!==p.level){old.setIcon(icon(p));old.__mtrwMeta={username:p.username,level:p.level}}}
    else {const m=L.marker([p.lat,p.lng],{icon:icon(p),interactive:false}).addTo(map);m.__mtrwMeta={username:p.username,level:p.level};markers.set(p.user_id,m)}
  };
  const removeStale=rows=>{
    const active=new Set(rows.map(p=>p.user_id));
    markers.forEach((m,id)=>{if(!active.has(id)){map.removeLayer(m);markers.delete(id)}})
  };
  const load=async()=>{
    const cutoff=new Date(Date.now()-30000).toISOString();
    const r=await db.from('mtrw_live_players').select('*').gte('updated_at',cutoff);
    if(r.error)return; removeStale(r.data||[]); (r.data||[]).forEach(render);
  };
  watchId=navigator.geolocation.watchPosition(upsert,()=>{}, {enableHighAccuracy:true,maximumAge:5000,timeout:15000});
  const channel=db.channel('mtrw-live-players').on('postgres_changes',{event:'*',schema:'public',table:'mtrw_live_players'},()=>load()).subscribe();
  await load();
  setInterval(load,10000);
  window.addEventListener('beforeunload',()=>{if(watchId!==null)navigator.geolocation.clearWatch(watchId);db.from('mtrw_live_players').delete().eq('user_id',user.id).then(()=>{})});
};
const s=setInterval(()=>{if(window.db&&window.__mtrwMap){clearInterval(s);boot()}},500);
})();