/* MTRW Discord logging bridge v3
   Discord webhook URLs never live in the browser. Events go to the Supabase Edge Function.
*/
(()=>{
  'use strict';
  if(window.mtrwLogsInstalled)return;
  const ENDPOINT='https://ufqdntsxgqcxtszufbtv.supabase.co/functions/v1/game-logs';
  const allowed=new Set(['game','player','register','chat']);
  let attempts=0;
  const install=()=>{
    if(window.mtrwLogsInstalled)return;
    if(!window.db){if(++attempts<100)setTimeout(install,100);return;}
    window.mtrwLogsInstalled=true;
    async function log(category,event,details={}){
      if(!allowed.has(category)||!event)return false;
      try{
        const session=(await window.db.auth.getSession()).data.session;
        if(!session)return false;
        const r=await fetch(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+session.access_token,'apikey':window.SUPABASE_KEY||''},body:JSON.stringify({category,event,details})});
        if(!r.ok)console.warn('[MTRW] Discord log failed',r.status);
        return r.ok;
      }catch(e){console.warn('[MTRW] Discord log failed',e);return false;}
    }
    window.mtrwLog=log;
    window.mtrwGameEvent=(event,details={})=>log('game',event,details);
    window.mtrwPlayerEvent=(event,details={})=>log('player',event,details);
    window.mtrwRegisterEvent=(event,details={})=>log('register',event,details);
    window.mtrwChatEvent=(event,details={})=>log('chat',event,details);
    window.addEventListener('mtrw:game-event',e=>e.detail&&log('game',e.detail.event,e.detail.details||{}));
    window.addEventListener('mtrw:player-event',e=>e.detail&&log('player',e.detail.event,e.detail.details||{}));
    window.addEventListener('mtrw:register-event',e=>e.detail&&log('register',e.detail.event,e.detail.details||{}));
    window.addEventListener('mtrw:chat-event',e=>e.detail&&log('chat',e.detail.event,e.detail.details||{}));
    console.info('[MTRW] Discord logging bridge ready');
  };
  install();
})();
