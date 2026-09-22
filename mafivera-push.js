/* MAFIVERA – Web Push client */
(()=>{'use strict';
if(window.__mtrwPushLoaded)return;window.__mtrwPushLoaded=true;
const SUPABASE_PUSH='https://ufqdntsxgqcxtszufbtv.supabase.co/functions/v1/mtrw-push-v2';
const SW='./mafivera-sw.js?v=MAFIVERA-PUSH-V5-OFFLINE-FIX-20260922-03';
const b64=s=>{const p='='.repeat((4-s.length%4)%4),x=(s+p).replace(/-/g,'+').replace(/_/g,'/'),r=atob(x);return Uint8Array.from(r,c=>c.charCodeAt(0))};
async function prefs(){if(!window.db)return null;const r=await window.db.rpc('mtrw_get_notification_preferences');if(r.error)throw r.error;return r.data||null}
async function savePrefs(v){const r=await window.db.rpc('mtrw_set_notification_preferences',v);if(r.error)throw r.error;return r.data}
async function enable(){
 if(!('Notification'in window)||!('serviceWorker'in navigator)||!('PushManager'in window))throw new Error('Push-Benachrichtigungen werden von diesem Browser nicht unterstützt.');
 const permission=Notification.permission==='granted'?'granted':await Notification.requestPermission();
 if(permission!=='granted')throw new Error('Benachrichtigungen wurden nicht erlaubt.');
 const keyRes=await fetch(SUPABASE_PUSH,{cache:'no-store'});if(!keyRes.ok)throw new Error('Push-Dienst konnte nicht erreicht werden.');
 const key=await keyRes.json();if(!key.publicKey)throw new Error('Push-Dienst konnte nicht initialisiert werden.');
 const reg=await navigator.serviceWorker.register(SW,{scope:'./'});
 await navigator.serviceWorker.ready;
 let sub=await reg.pushManager.getSubscription();
 if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64(key.publicKey)});
 const j=sub.toJSON();
 if(!j?.endpoint||!j?.keys?.p256dh||!j?.keys?.auth)throw new Error('Push-Abonnement konnte nicht erstellt werden.');
 const r=await window.db.rpc('mtrw_save_push_subscription',{p_endpoint:j.endpoint,p_p256dh:j.keys.p256dh,p_auth:j.keys.auth,p_user_agent:navigator.userAgent});
 if(r.error)throw r.error;
 await savePrefs({p_push_enabled:true});
 return true;
}
async function disable(){
 if(!window.db)return;
 try{const reg=await navigator.serviceWorker.getRegistration('./');const sub=await reg?.pushManager.getSubscription();if(sub){await window.db.rpc('mtrw_delete_push_subscription',{p_endpoint:sub.endpoint});await sub.unsubscribe()}}catch(e){}
 await savePrefs({p_push_enabled:false});
}
async function status(){
 const p=await prefs();
 let subscribed=false;
 try{const reg=await navigator.serviceWorker.getRegistration('./');subscribed=!!(await reg?.pushManager.getSubscription())}catch(e){}
 return {prefs:p,permission:('Notification'in window?Notification.permission:'unsupported'),subscribed};
}
async function repair(){try{if(!('Notification'in window)||Notification.permission!=='granted'||!window.db)return false;const st=await status();if(!st.subscribed){await enable();return true}if(!st.prefs?.push_enabled)await savePrefs({p_push_enabled:true});return true}catch(e){window.__mtrwPushLastError=String(e?.message||e);console.warn('MAFIVERA Push-AutoRepair',e);return false}}
window.mtrwPush={enable,disable,prefs,savePrefs,status,repair};
setTimeout(()=>repair(),3000);window.addEventListener('pointerdown',()=>{if('Notification'in window&&Notification.permission==='granted')repair()},{once:true,passive:true});window.addEventListener('pointerdown',()=>{if(Notification?.permission==='granted')repair()},{once:true,passive:true});
})();