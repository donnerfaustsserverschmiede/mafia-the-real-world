/* MTRW Discord logging bridge v1
   Webhook URLs never live in the browser. The client sends authenticated events
   to the Supabase Edge Function, which owns the Discord webhook secrets.
*/
(()=>{
  if(window.mtrwLogsInstalled||!window.db)return;
  window.mtrwLogsInstalled=true;
  const ENDPOINT='https://ufqdntsxgqcxtszufbtv.supabase.co/functions/v1/game-logs';
  const allowed=new Set(['game','player','register','chat']);
  async function log(category,event,details={}){
    if(!allowed.has(category)||!event)return false;
    try{
      const session=(await window.db.auth.getSession()).data.session;
      if(!session)return false;
      const r=await fetch(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+session.access_token,'apikey':typeof SUPABASE_PUBLISHABLE_KEY!=='undefined'?SUPABASE_PUBLISHABLE_KEY:''},body:JSON.stringify({category,event,details})});
      return r.ok;
    }catch(e){console.warn('[MTRW] Discord log failed',e);return false}
  }
  window.mtrwLog=log;
  window.mtrwGameEvent=(event,details={})=>log('game',event,details);
  window.mtrwPlayerEvent=(event,details={})=>log('player',event,details);
  window.mtrwRegisterEvent=(event,details={})=>log('register',event,details);
  window.mtrwChatEvent=(event,details={})=>log('chat',event,details);
  window.addEventListener('mtrw:game-event',e=>{if(e.detail)log('game',e.detail.event,e.detail.details||{})});
  window.addEventListener('mtrw:player-event',e=>{if(e.detail)log('player',e.detail.event,e.detail.details||{})});
  window.addEventListener('mtrw:register-event',e=>{if(e.detail)log('register',e.detail.event,e.detail.details||{})});
  window.addEventListener('mtrw:chat-event',e=>{if(e.detail)log('chat',e.detail.event,e.detail.details||{})});
  const originalClaim=window.claimRealPlace;
  if(typeof originalClaim==='function'){
    window.claimRealPlace=async()=>{
      const before=window.getMtrwState?.()?.profile;
      const result=await originalClaim();
      const after=window.getMtrwState?.()?.profile;
      const current=window.current;
      log('player','Gebietsübernahme',{place_id:current||null,before_money:before?.money??null,after_money:after?.money??null,before_reputation:before?.reputation??null,after_reputation:after?.reputation??null});
      return result;
    };
  }
})();
