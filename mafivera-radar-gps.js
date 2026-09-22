/* MAFIVERA – radar/GPS: player-centered 500 m radar + persistent player GPS */
(()=>{'use strict';
if(window.__mtrwRadarGpsLoaded)return;
window.__mtrwRadarGpsLoaded=true;
const RADIUS=500;
let timer=null,watchId=null;

function valid(lat,lng){
  return Number.isFinite(Number(lat))&&Number.isFinite(Number(lng))&&Math.abs(Number(lat))<=90&&Math.abs(Number(lng))<=180;
}
function draw(lat,lng){
  const map=window.__mtrwMap;
  if(!map||!window.L||!valid(lat,lng))return;
  const p=[Number(lat),Number(lng)];
  window.__mtrwProfile={...(window.__mtrwProfile||{}),gps_lat:p[0],gps_lng:p[1]};
  let radar=window.__mtrwRadarCircle;
  if(!radar||!map.hasLayer(radar)){
    radar=L.circle(p,{radius:RADIUS,color:'#45e06f',weight:2,fillColor:'#45e06f',fillOpacity:.06,interactive:false,bubblingMouseEvents:false}).addTo(map);
    window.__mtrwRadarCircle=radar;
  }else radar.setLatLng(p);
}
async function saveGps(lat,lng,accuracy){
  try{
    const db=window.db;if(!db||!valid(lat,lng))return;
    const {data:{user}}=await db.auth.getUser();if(!user)return;
    await db.rpc('mtrw_presence_heartbeat',{
      p_lat:Number(lat),
      p_lng:Number(lng),
      p_accuracy:Number.isFinite(Number(accuracy))?Number(accuracy):null
    });
  }catch(e){}
}
async function fromProfile(){
  try{
    const db=window.db;if(!db)return;
    const {data:{user}}=await db.auth.getUser();if(!user)return;
    const q=await db.from('profiles').select('gps_lat,gps_lng,gps_accuracy').eq('id',user.id).maybeSingle();
    const p=q.data;
    if(p&&valid(p.gps_lat,p.gps_lng))draw(p.gps_lat,p.gps_lng);
  }catch(e){}
}
function startGps(){
  if(!navigator.geolocation||watchId!==null)return;
  watchId=navigator.geolocation.watchPosition(
    p=>{
      if(!valid(p.coords.latitude,p.coords.longitude))return;
      draw(p.coords.latitude,p.coords.longitude);
      saveGps(p.coords.latitude,p.coords.longitude,p.coords.accuracy);
    },
    ()=>{},
    {enableHighAccuracy:true,maximumAge:5000,timeout:15000}
  );
}
function boot(){
  if(timer)return;
  startGps();
  fromProfile();
  let tries=0;
  timer=setInterval(()=>{fromProfile();if(++tries>180){clearInterval(timer);timer=null;}},2000);
}
function wait(){
  if(window.db&&window.__mtrwMap)boot();
  else setTimeout(wait,250);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wait);else wait();
window.addEventListener('beforeunload',()=>{if(watchId!==null&&navigator.geolocation)navigator.geolocation.clearWatch(watchId);});
})();