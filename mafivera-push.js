/* MAFIVERA – Web Push client */
(()=>{'use strict';
if(window.__mtrwPushLoaded)return;window.__mtrwPushLoaded=true;
const SUPABASE_PUSH='https://ufqdntsxgqcxtszufbtv.supabase.co/functions/v1/mtrw-push-v2';
const b64=s=>{const p='='.repeat((4-s.length%4)%4),x=(s+p).replace(/-/g,'+').replace(/_/g,'/'),r=atob(x);return Uint8Array.from(r,c=>c.charCodeAt(0))};
async function prefs(){try{return await window.db.rpc('mtrw_get_notification_preferences')}catch(e){return null}}
async function savePrefs(v){const r=await window.db.rpc('mtrw_set_notification_preferences',v);if(r.error)throw r.error;return r.data}
async function enable(){
 if(!('Notification'in window)||!('serviceWorker'in navigator)||!('PushManager'in window))throw new Error('Push-Benachrichtigungen werden von diesem Browser nicht unterstützt.');
 const permission=await Notification.requestPermission();if(permission!=='granted')throw new Error('Benachrichtigungen wurden nicht erlaubt.');
 const keyRes=await fetch(SUPABASE_PUSH,{cache:'no-store'});const key=await keyRes.json();if(!key.publicKey)throw new Error('Push-Dienst konnte nicht initialisiert werden.');
 const reg=await navigator.serviceWorker.register('./mafivera-sw.js?v=20260921-push1',{scope:'./'});
 let sub=await reg.pushManager.getSubscription();if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64(key.publicKey)});
 const j=sub.toJSON();const r=await window.db.rpc('mtrw_save_push_subscription',{p_endpoint:j.endpoint,p_p256dh:j.keys.p256dh,p_auth:j.keys.auth,p_user_agent:navigator.userAgent});if(r.error)throw r.error;
 await savePrefs({p_push_enabled:true});return true;
}
async function disable(){
 if(!window.db)return;
 try{const reg=await navigator.serviceWorker.getRegistration('./');const sub=await reg?.pushManager.getSubscription();if(sub){await window.db.rpc('mtrw_delete_push_subscription',{p_endpoint:sub.endpoint});await sub.unsubscribe()}}catch(e){}
 await savePrefs({p_push_enabled:false});
}
window.mtrwPush={enable,disable,prefs,savePrefs};
})();