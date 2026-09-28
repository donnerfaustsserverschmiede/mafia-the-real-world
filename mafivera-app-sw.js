/* MAFIVERA PWA service worker — offline-capable shell and cached map tiles */
const VERSION='7.1.3-pwa-install-02';
const CACHE='mafivera-offline-'+VERSION;
const CORE=['./','./index.html','./manifest.webmanifest','./assets/mafivera-icon-192.svg','./assets/mafivera-icon-512.svg','./mafivera-offline.js'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE).catch(()=>{})).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting();if(event.data?.type==='CHECK_UPDATE')self.registration.update()});
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET')return;
 const u=new URL(event.request.url);
 if(u.hostname.includes('tile.openstreetmap.org')){
   event.respondWith(caches.open(CACHE).then(async c=>{const hit=await c.match(event.request);try{const r=await fetch(event.request);if(r.ok||r.type==='opaque')c.put(event.request,r.clone());return r}catch(_){return hit||new Response('',{status:503})}}));return;
 }
 if(u.origin===location.origin){
   event.respondWith(caches.open(CACHE).then(async c=>{
     try{
       const r=await fetch(event.request,{cache:'no-store'});
       if(r.ok)c.put(event.request,r.clone());
       return r;
     }catch(_){
       if(event.request.mode==='navigate'){
         return (await c.match('./index.html')) || (await c.match('./')) || new Response('',{status:503});
       }
       return (await c.match(event.request))||new Response('',{status:503});
     }
   }));return;
 }
});
