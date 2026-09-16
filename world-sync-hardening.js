/* MAFIVERA — reliable world publishing/polling */
(()=>{'use strict';
const wait=()=>{if(!window.db)return setTimeout(wait,250);window.db.auth.getSession().then(({data})=>{const u=data?.session?.user;if(!u)return;const key='mafivera:v1:save:'+u.id,GL=.0018,GW=.0025;const read=()=>{try{return JSON.parse(localStorage.getItem(key)||'{}')}catch(e){return{}}};const globalKey=(lat,lng)=>`z_${Math.floor(lat/GL)}_${Math.floor(lng/GW)}`;const center=(s,id)=>{const m=/^g_(-?\d+)_(-?\d+)$/.exec(id);if(!m||!s.worldOrigin)return null;return{lat:s.worldOrigin.lat+(+m[1]+.5)*GL,lng:s.worldOrigin.lng+(+m[2]+.5)*GW}};
 const publish=async()=>{const s=read();if(!s.worldOrigin)return;for(const id of Object.keys(s.fields||{})){const c=center(s,id);if(!c)continue;await window.db.rpc('sync_world_territory',{p_zone_key:globalKey(c.lat,c.lng),p_center_lat:c.lat,p_center_lng:c.lng,p_defense_points:25,p_garrison:Number(s.built?.[id]?.troops||0),p_building_type:s.built?.[id]?.type||null,p_building_defense:0,p_support_bonus:0}).catch(()=>null)}};
 const fire=async()=>{await publish();window.dispatchEvent(new Event('mafivera:worldRefresh'))};fire();setInterval(fire,4000);window.addEventListener('mafivera:territoryChanged',fire);window.addEventListener('mafivera:buildingChanged',publish);
 })};wait();
})();
