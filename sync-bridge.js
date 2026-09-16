/* MAFIVERA — authoritative reconnect sync for territory + buildings */
(()=>{'use strict';
if(window.MAFIVERA_SYNC_BRIDGE)return;window.MAFIVERA_SYNC_BRIDGE=true;
const PENDING='mafivera:v1:pending-sync';
const read=()=>{try{return JSON.parse(localStorage.getItem(PENDING)||'[]')}catch(e){return[]}};
const write=v=>{try{localStorage.setItem(PENDING,JSON.stringify(v))}catch(e){}};
const mark=()=>{const q=read();if(!q.includes('world'))q.push('world');write(q)};
const sync=async()=>{
 if(!navigator.onLine||!window.db)return;
 try{
  if(typeof window.MAFIVERA_SYNC_DEFENSE==='function')await window.MAFIVERA_SYNC_DEFENSE();
  const s=window.db;
  const ses=(await s.auth.getSession()).data?.session;
  const uid=ses?.user?.id;if(!uid)return;
  const k='mafivera:v1:save:'+uid;let save={};try{save=JSON.parse(localStorage.getItem(k)||'{}')}catch(e){}
  const origin=save.worldOrigin;if(!origin)return;
  const GL=.0018,GW=.0025;
  const center=id=>{const m=/^g_(-?\d+)_(-?\d+)$/.exec(id);if(!m)return null;return{lat:origin.lat+(+m[1]+.5)*GL,lng:origin.lng+(+m[2]+.5)*GW}};
  const defense={warehouse:10,money:10,club:8,lab:15,market:10,watch:25,hideout:40};
  const support=(id)=>{const m=/^g_(-?\d+)_(-?\d+)$/.exec(id);if(!m)return 0;const r=+m[1],c=+m[2];let v=0;Object.entries(save.built||{}).forEach(([bid,b])=>{const x=/^g_(-?\d+)_(-?\d+)$/.exec(bid);if(!x||bid===id||!save.fields?.[bid])return;const d=b?.type==='watch'?{bonus:.25,radius:1}:b?.type==='hideout'?{bonus:.75,radius:2}:null;if(d&&Math.max(Math.abs(+x[1]-r),Math.abs(+x[2]-c))<=d.radius)v+=d.bonus});return v};
  for(const[id,f]of Object.entries(save.fields||{})){const c=center(id);if(!c)continue;const b=save.built?.[id];const vp=Math.max(25,Math.ceil((25+(defense[b?.type]||0))*(1+support(id))));const r=await s.rpc('sync_world_territory',{p_zone_key:`z_${Math.floor(c.lat/GL)}_${Math.floor(c.lng/GW)}`,p_center_lat:c.lat,p_center_lng:c.lng,p_defense_points:vp,p_garrison:Number(b?.troops||0),p_building_type:b?.type||null,p_building_defense:defense[b?.type]||0,p_support_bonus:support(id)});if(r.error&&r.error.code!=='42501')console.warn('[MAFIVERA sync bridge]',r.error.message)}
  write([]);window.dispatchEvent(new Event('mafivera:worldRefresh'));
 }catch(e){mark();console.warn('[MAFIVERA reconnect]',e)}
};
window.MAFIVERA_REQUEST_SYNC=()=>{mark();if(navigator.onLine)setTimeout(sync,100)};
window.addEventListener('mafivera:buildingChanged',()=>{mark();sync()});
window.addEventListener('mafivera:territoryChanged',()=>{mark();sync()});
window.addEventListener('online',()=>setTimeout(sync,350));
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')setTimeout(sync,150)});
let n=0;const wait=()=>{if(window.db){sync();return}if(n++<120)setTimeout(wait,250)};wait();
})();
