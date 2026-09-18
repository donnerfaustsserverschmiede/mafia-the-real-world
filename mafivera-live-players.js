(()=>{'use strict';
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
  const icon=(p,self=false)=>L.divIcon({className:'mtrw-live-player',html:'<span>👤</span><b>'+String(p.username||'Spieler').replace(/[<>&"]/g,'')+(self?' · DU':'')+'</b>',iconSize:[90,42],iconAnchor:[45,21]});
  if(!document.getElementById('mtrwLivePlayerCSS')){const s=document.createElement('style');s.id='mtrwLivePlayerCSS';s.textContent=`.mtrw-live-player,.mtrw-live-player.leaflet-marker-icon{background:transparent!important;border:0!important;box-shadow:none!important;width:90px!important;height:42px!important;pointer-events:auto}.mtrw-live-player span{display:block;width:24px;height:24px;margin:0 auto;border-radius:50%;font-size:18px;line-height:24px;text-align:center;background:#10151e;border:2px solid #fff;box-shadow:0 0 0 4px #3a95ff55,0 2px 8px #000}.mtrw-live-player b{display:block;width:max-content;max-width:90px;margin:2px auto 0;padding:2px 5px;border-radius:5px;background:#10151ee8;border:1px solid #394653;color:#fff;font:800 8px/10px system-ui,sans-serif;white-space:nowrap;text-align:center}.mtrw-live-player-label{background:#10151ee8!important;border:1px solid #394653!important;color:#fff!important;box-shadow:none!important;border-radius:5px!important;padding:2px 5px!important;font:800 8px/10px system-ui,sans-serif!important;white-space:nowrap!important}.mtrw-live-player-label:before{display:none!important}`;document.head.appendChild(s)}
  const render=p=>{
    if(p.user_id===user.id)return;
    const old=markers.get(p.user_id);
    if(old){old.setLatLng([p.lat,p.lng]);const meta=old.__mtrwMeta||{};if(meta.username!==p.username||meta.level!==p.level){old.setIcon(icon(p));old.__mtrwMeta={username:p.username,level:p.level}}}
    else {const m=L.marker([p.lat,p.lng],{icon:icon(p),interactive:false}).addTo(map);m.bindTooltip(String(p.username||'Spieler').replace(/[<>&"]/g,''),{permanent:true,direction:'bottom',offset:[0,20],className:'mtrw-live-player-label'});m.__mtrwMeta={username:p.username,level:p.level};markers.set(p.user_id,m)}
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