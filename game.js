/* MAFIVERA V1 — Map-first Game Shell */
(()=>{
'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const load=(src)=>new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=reject;document.head.appendChild(s)});
const start=async()=>{
 if(!window.db)return setTimeout(start,100);
 const {data}=await window.db.auth.getSession();
 if(!data?.session){location.reload();return;}
 const user=data.session.user,meta=user.user_metadata||{},name=meta.username||user.email?.split('@')[0]||'Spieler';
 const root=document.getElementById('gameRoot');if(!root)return;
 if(!document.getElementById('mafiveraGameCss')){const css=document.createElement('link');css.id='mafiveraGameCss';css.rel='stylesheet';css.href='./game.css?v=2';document.head.appendChild(css)}
 if(!window.L){try{await load('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js')}catch(e){try{await load('https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js')}catch(e2){}}}
 let gpsWatchId=null,gpsActive=false,marker=null,accuracyCircle=null,map=null;
 const gpsState={lat:null,lng:null,accuracy:null};
 root.innerHTML=`<div class="mafivera-game">
 <header class="hud">
  <button id="menuBtn" class="icon-btn" aria-label="Menü">☰</button>
  <div class="hud-brand"><b>MAFIVERA</b><span>Die Welt gehört dir</span></div>
  <div class="hud-stats"><span>💰 <b id="money">0</b></span><span>⭐ <b id="level">1</b></span></div>
 </header>
 <main id="worldMap" class="world-map"></main>
 <div class="map-overlay top-left"><div class="location-pill"><span id="gpsIndicator">●</span><span id="gpsText">Standort nicht aktiviert</span></div></div>
 <div class="map-overlay top-right"><button id="locateBtn" class="map-btn" aria-label="Meinen Standort">⌖</button></div>
 <section id="drawer" class="drawer hidden"><div class="drawer-head"><div><small>MAFIVERA</small><h2 id="drawerTitle">Menü</h2></div><button id="drawerClose" class="close-btn">×</button></div><div id="drawerBody"></div></section>
 <nav class="bottom-nav">
  <button class="bottom-btn active" data-panel="map"><span>🗺️</span><small>Karte</small></button>
  <button class="bottom-btn" data-panel="family"><span>🏴</span><small>Familie</small></button>
  <button class="bottom-btn" data-panel="social"><span>👥</span><small>Sozial</small></button>
  <button class="bottom-btn" data-panel="business"><span>🏭</span><small>Geschäft</small></button>
  <button class="bottom-btn" data-panel="profile"><span>👤</span><small>Profil</small></button>
 </nav>
 <div id="toast" class="toast" aria-live="polite"></div>
 </div>`;
 const toast=(text)=>{const el=document.getElementById('toast');el.textContent=text;el.classList.add('show');clearTimeout(el._t);el._t=setTimeout(()=>el.classList.remove('show'),2200)};
 const drawer=document.getElementById('drawer'),title=document.getElementById('drawerTitle'),body=document.getElementById('drawerBody');
 const openDrawer=(panel)=>{
  if(panel==='map'){drawer.classList.add('hidden');return}
  const content={
   family:`<div class="panel-hero">🏴<div><b>Deine Familie</b><p>Noch keine Familie gegründet.</p></div></div><button class="panel-action" data-action="create-family">+ Familie gründen</button><div class="panel-grid"><div><b>0</b><small>Mitglieder</small></div><div><b>0</b><small>Gebiete</small></div><div><b>0</b><small>Einfluss</small></div></div>`,
   social:`<div class="panel-hero">👥<div><b>Sozial</b><p>Spieler, Kontakte und Nachrichten.</p></div></div><button class="panel-action" data-action="friends">👤 Freunde</button><button class="panel-action" data-action="chat">💬 Nachrichten</button><button class="panel-action" data-action="requests">🤝 Anfragen</button>`,
   business:`<div class="panel-hero">🏭<div><b>Dein Geschäft</b><p>Hier entsteht dein Produktionsbetrieb.</p></div></div><div class="production-card"><div><span>Produktion</span><b>Bereit zum Aufbau</b></div><div class="production-progress"><i></i></div></div><button class="panel-action" data-action="production">⚗️ Produktion verwalten</button><button class="panel-action" data-action="storage">📦 Lager</button>`,
   profile:`<div class="profile-big">👤</div><h3>${esc(name)}</h3><p class="muted">${esc(user.email||'Keine E-Mail hinterlegt')}</p><div class="profile-list"><div><span>Level</span><b>1</b></div><div><span>Vermögen</span><b>0 $</b></div><div><span>GPS</span><b id="profileGps">${gpsActive?'Aktiv':'Aus'}</b></div></div><button class="panel-action danger" data-action="logout">Abmelden</button>`,
   menu:`<button class="panel-action" data-action="settings">⚙️ Einstellungen</button><button class="panel-action" data-action="help">❓ Hilfe</button><button class="panel-action" data-action="logout">🚪 Abmelden</button>`
  };
  title.textContent=panel==='menu'?'Menü':panel==='family'?'Familie':panel==='social'?'Sozial':panel==='business'?'Geschäft':'Profil';body.innerHTML=content[panel]||'';drawer.classList.remove('hidden');
  body.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>{
   const a=b.dataset.action;
   if(a==='logout'){stopGps();window.db.auth.signOut().finally(()=>location.reload());return}
   toast(a==='create-family'?'Familiengründung kommt als nächstes.':a==='production'?'Das Produktionssystem wird als nächstes gebaut.':'Bereich wird vorbereitet.');
  });
 };
 document.querySelectorAll('.bottom-btn').forEach(btn=>btn.onclick=()=>{document.querySelectorAll('.bottom-btn').forEach(x=>x.classList.remove('active'));btn.classList.add('active');openDrawer(btn.dataset.panel);if(typeof window.mtrwGameEvent==='function')window.mtrwGameEvent('Menü geöffnet',{bereich:btn.dataset.panel})});
 document.getElementById('menuBtn').onclick=()=>openDrawer('menu');document.getElementById('drawerClose').onclick=()=>drawer.classList.add('hidden');drawer.onclick=e=>{if(e.target===drawer)drawer.classList.add('hidden')};
 const setGps=(text,active=false)=>{document.getElementById('gpsText').textContent=text;document.getElementById('gpsIndicator').classList.toggle('active',active)};
 const stopGps=()=>{if(gpsWatchId!==null&&navigator.geolocation){navigator.geolocation.clearWatch(gpsWatchId);gpsWatchId=null}gpsActive=false;setGps('Standort pausiert',false);if(typeof window.mtrwGameEvent==='function')window.mtrwGameEvent('GPS-Tracking gestoppt',{})};
 const startGps=()=>{if(!navigator.geolocation){toast('Dieser Browser unterstützt keinen Standortzugriff.');return}if(!window.isSecureContext){toast('GPS benötigt eine sichere HTTPS-Verbindung.');return}if(gpsActive)return;setGps('Standort wird ermittelt…');gpsWatchId=navigator.geolocation.watchPosition(pos=>{gpsActive=true;gpsState.lat=pos.coords.latitude;gpsState.lng=pos.coords.longitude;gpsState.accuracy=pos.coords.accuracy;setGps('GPS aktiv · ± '+Math.round(pos.coords.accuracy)+' m',true);if(map){if(!marker){marker=L.marker([gpsState.lat,gpsState.lng],{title:'Deine Position'}).addTo(map).bindPopup('📍 Deine Position');accuracyCircle=L.circle([gpsState.lat,gpsState.lng],{radius:gpsState.accuracy,color:'#d6ad2d',fillOpacity:.06,weight:1}).addTo(map)}else{marker.setLatLng([gpsState.lat,gpsState.lng]);accuracyCircle.setLatLng([gpsState.lat,gpsState.lng]).setRadius(gpsState.accuracy)}}},err=>{gpsActive=false;setGps(err.code===1?'Standortzugriff verweigert':'Standort nicht verfügbar');toast(err.code===1?'Standortberechtigung wurde verweigert.':'Standort konnte nicht ermittelt werden.');if(typeof window.mtrwGameEvent==='function')window.mtrwGameEvent('GPS-Fehler',{code:err.code})},{enableHighAccuracy:true,maximumAge:5000,timeout:15000});if(typeof window.mtrwPlayerEvent==='function')window.mtrwPlayerEvent('Standortzugriff gestartet',{})};
 document.getElementById('locateBtn').onclick=()=>{if(!gpsActive){startGps();return}if(marker)map.setView(marker.getLatLng(),17)};
 if(window.L){map=L.map('worldMap',{zoomControl:false,attributionControl:true}).setView([51.1657,10.4515],6);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(map);L.control.zoom({position:'bottomright'}).addTo(map);map.on('click',()=>drawer.classList.add('hidden'));setTimeout(()=>map.invalidateSize(),150)}else{document.getElementById('worldMap').innerHTML='<div class="map-fallback">🗺️<b>Karte konnte nicht geladen werden</b><span>Bitte Seite neu laden.</span></div>'}
 window.addEventListener('beforeunload',stopGps);
 if(typeof window.mtrwGameEvent==='function')window.mtrwGameEvent('Game geladen',{username:name});
};
start();
})();