/* MAFIVERA – Player Presence Heartbeat */
(()=>{'use strict';
if(window.__mtrwPresenceStarted)return;window.__mtrwPresenceStarted=true;
const INTERVAL=20000;
let userId=null,timer=null,inFlight=false;
const mark=async()=>{
  if(!window.db||!userId||inFlight||document.visibilityState==='hidden')return;
  inFlight=true;
  try{
    await window.db.from('profiles').update({last_seen_at:new Date().toISOString()}).eq('id',userId);
  }catch(e){}
  finally{inFlight=false}
};
const boot=async()=>{
  if(!window.db)return;
  try{const {data:{user}}=await window.db.auth.getUser();if(!user)return;userId=user.id;await mark();timer=setInterval(mark,INTERVAL);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')mark()});window.addEventListener('beforeunload',()=>{try{window.db.from('profiles').update({last_seen_at:new Date(0).toISOString()}).eq('id',userId)}catch(e){}})}catch(e){}
};
const wait=setInterval(()=>{if(window.db){clearInterval(wait);boot()}},500);
})();