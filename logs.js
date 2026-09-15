/* MTRW Discord logging bridge v2
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
      const session=(await window.db.auth.getSession()).data.session;if(!session)return false;
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
  const auth=window.db.auth;
  const originalSignUp=auth.signUp.bind(auth);
  auth.signUp=async(...args)=>{const r=await originalSignUp(...args);if(!r.error&&r.data?.user)log('register','Neue Spielerregistrierung',{username:args[0]?.options?.data?.username||null,email:args[0]?.email||null});return r};
  const originalSignIn=auth.signInWithPassword.bind(auth);
  auth.signInWithPassword=async(...args)=>{const r=await originalSignIn(...args);if(!r.error&&r.data?.user)log('player','Spieler angemeldet',{username:r.data.user.user_metadata?.username||null});return r};
  const originalReset=auth.resetPasswordForEmail.bind(auth);
  auth.resetPasswordForEmail=async(...args)=>{const r=await originalReset(...args);if(!r.error)log('player','Passwort-Reset angefordert',{email:args[0]||null});return r};
  const originalClaim=window.claimRealPlace;
  if(typeof originalClaim==='function'){
    window.claimRealPlace=async()=>{
      const st=window.getMtrwState?.()||{},beforeMoney=Number(st.profile?.money||0),beforeRep=Number(st.profile?.reputation||0),current=window.current;
      const result=await originalClaim();
      const after=window.getMtrwState?.()?.profile,afterMoney=Number(after?.money||0),afterRep=Number(after?.reputation||0);
      if(afterMoney>beforeMoney||afterRep>beforeRep)log('player','Gebietsübernahme',{place_id:current||null,money_gain:afterMoney-beforeMoney,reputation_gain:afterRep-beforeRep});
      return result;
    };
  }
})();
