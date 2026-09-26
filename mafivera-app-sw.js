/* MAFIVERA PWA service worker — installable app, network-first, no stale game cache */
const VERSION='6.1.2-pwa-06';
self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting()});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  event.respondWith(fetch(event.request,{cache:'no-store'}));
});
self.addEventListener('message',event=>{
  if(event.data?.type==='CHECK_UPDATE') self.registration.update();
});
