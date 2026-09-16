/* MAFIVERA V1 — functional heist system */
(()=>{'use strict';
 if(window.MAFIVERA_HEIST_SYSTEM)return; window.MAFIVERA_HEIST_SYSTEM=true;
 const WAIT=fn=>{let n=0;const t=()=>{if(window.db&&window.mtrwClaim)return fn();if(++n<160)setTimeout(t,100)};t()};
 WAIT(async()=>{
  const session=(await window.db.auth.getSession()).data?.session;if(!session?.user)return;
  const key='mafivera:v1:save:'+session.user.id;
  const read=()=>{try{return JSON.parse(localStorage.getItem(key)||'{}')}catch(e){return {}}};
  const write=s=>{try{localStorage.setItem(key,JSON.stringify(s))}catch(e){}};
  const toast=t=>{const e=document.getElementById('toast');if(!e)return;e.textContent=t;e.classList.add('show');clearTimeout(e._heistToast);e._heistToast=setTimeout(()=>e.classList.remove('show'),3000)};
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const cell=id=>{const m=/^g_(-?\d+)_(-?\d+)$/.exec(id);return m?{row:+m[1],col:+m[2]}:null};
  const id=(r,c)=>`g_${r}_${c}`;
  const dist=(a,b)=>Math.max(Math.abs(a.row-b.row),Math.abs(a.col-b.col));
  const MAX=60, DURATION=30*60*1000, COOLDOWN=60*60*1000;
  const threatType=(r,c)=>{const n=Math.abs(r*19+c*23)%9;return n===0?'Bank':n<3?'Geschäft':'Schwarzmarkt'};
  const isThreatCell=(r,c)=>Math.abs(r*19+c*23)%9<3;
  const targetName=(r,c)=>`Sektor ${r>=0?'N':'S'}${Math.abs(r)}-${c>=0?'O':'W'}${Math.abs(c)}`;
  const normalize=s=>{s.heists=Array.isArray(s.heists)?s.heists:[];s.threatFields=Array.isArray(s.threatFields)?s.threatFields:[];return s};
  const nearbyThreats=s=>{
   if(!s.worldOrigin)return [];
   const center=s.gps?{lat:s.gps.lat,lng:s.gps.lng}:s.worldOrigin;
   const gl=.0018,gw=.0025,cr=Math.floor((center.lat-s.worldOrigin.lat)/gl),cc=Math.floor((center.lng-s.worldOrigin.lng)/gw),out=[];
   for(let r=cr-6;r<=cr+6;r++)for(let c=cc-6;c<=cc+6;c++)if(isThreatCell(r,c)&&out.length<MAX){const cid=id(r,c);if(!s.fields?.[cid])out.push({cellId:cid,row:r,col:c,name:targetName(r,c),typeLabel:threatType(r,c)})}
   return out;
  };
  const ensureThreats=()=>{const s=normalize(read());const fresh=nearbyThreats(s),byId=new Map((s.threatFields||[]).map(x=>[x.cellId,x]));fresh.forEach(x=>{if(!byId.has(x.cellId))byId.set(x.cellId,x)});s.threatFields=[...byId.values()];write(s);return s};
  const running=()=>normalize(read()).heists.filter(h=>h.status==='running');
  const cooldownUntil=cellId=>{const s=normalize(read()),h=s.heists.filter(x=>x.cellId===cellId&&x.status==='resolved').sort((a,b)=>(b.resolvedAt||0)-(a.resolvedAt||0))[0];return Number(h?.cooldownUntil||((h?.resolvedAt||0)+COOLDOWN))};
  const start=id=>{
   let s=ensureThreats();const th=s.threatFields.find(x=>x.cellId===id);if(!th)return toast('Dieses Feld ist kein bedrohtes Ziel.');
   const now=Date.now(),active=s.heists.find(h=>h.cellId===id&&h.status==='running');if(active)return toast(`⚔ Heist läuft bereits · noch ${Math.ceil(Math.max(0,active.endsAt-now)/60000)} Min.`);
   const cd=cooldownUntil(id);if(cd>now)return toast(`🔒 Dieses Ziel hat noch ${Math.ceil((cd-now)/60000)} Min. Heist-Cooldown.`);
   const men=Math.floor(Number(s.hitmen||0));if(men<1)return toast('Keine Schläger verfügbar. Rekrutiere zuerst Schläger.');
   s.hitmen=men-1;s.heists.push({id:'h_'+now+'_'+Math.random().toString(36).slice(2,8),cellId:id,name:th.name,typeLabel:th.typeLabel,hitmen:1,status:'running',startedAt:now,endsAt:now+DURATION});write(s);toast(`🔫 1 Schläger entsendet · Heist dauert 30 Minuten.`);renderTargets();renderPanel();
  };
  const resolve=()=>{
   const s=normalize(read()),now=Date.now();let changed=false;
   s.heists.forEach(h=>{if(h.status!=='running'||now<h.endsAt)return;const success=Math.random()<.5,reward=success?Math.floor(50000+Math.random()*50001):0;h.status='resolved';h.resolvedAt=now;h.cooldownUntil=now+COOLDOWN;h.success=success;h.reward=reward;if(success)s.money=Number(s.money||0)+reward;s.hitmen=Number(s.hitmen||0)+Number(h.hitmen||1);changed=true;toast(success?`💰 Heist erfolgreich · +${reward.toLocaleString('de-DE')} $`:'❌ Heist fehlgeschlagen · keine Beute.');window.mtrwPlayerEvent?.(success?'Heist erfolgreich':'Heist fehlgeschlagen',{ziel:h.name,belohnung:reward})});
   if(changed)write(s);renderTargets();renderPanel();
  };
  const renderTargets=()=>{
   const s=ensureThreats();document.querySelectorAll('.leaflet-interactive').forEach(el=>{if(el.dataset?.heistTarget)el.removeAttribute('data-heist-target')});
   if(!window.map)return;
   document.querySelectorAll('.heist-field-overlay').forEach(e=>e.remove());
   const layer=window.mtrwHeistLayer;if(!layer)return;layer.clearLayers();
   s.threatFields.forEach(t=>{const parts=t.cellId.match(/^g_(-?\d+)_(-?\d+)$/);if(!parts)return;const r=+parts[1],c=+parts[2],gl=.0018,gw=.0025,o=s.worldOrigin||{lat:51.1657,lng:10.4515},lat=o.lat+(r+.5)*gl,lng=o.lng+(c+.5)*gw,h=gl/2,w=gw/2,active=s.heists.find(hh=>hh.cellId===t.cellId&&hh.status==='running'),cd=cooldownUntil(t.cellId),disabled=active||cd>Date.now();const rect=L.rectangle([[lat-h,lng-w],[lat+h,lng+w]],{color:'#ff2525',weight:3,fillColor:'#ff1717',fillOpacity:.22,interactive:true});rect.bindPopup(`<div class="popup-card heist-popup"><b>🔴 ${esc(t.name)}</b><br><strong>Bedrohtes ${esc(t.typeLabel)}</strong><br><small>Heist: 30 Minuten · Erfolgschance: 50 % · Beute: 50–100.000 $</small>${active?`<div class="heist-running">⚔ Schläger unterwegs<br><b>Noch ${Math.ceil(Math.max(0,active.endsAt-Date.now())/60000)} Min.</b></div>`:cd>Date.now()?`<div class="heist-cooldown">🔒 Cooldown · noch ${Math.ceil((cd-Date.now())/60000)} Min.</div>`:`<button onclick="window.mtrwStartHeist('${t.cellId}')">⚔ Schläger entsenden</button>`}</div>`);layer.addLayer(rect)});
  };
  const renderPanel=()=>{const title=document.getElementById('drawerTitle'),body=document.getElementById('drawerBody');if(!title||!body||title.textContent!=='Schläger')return;const s=ensureThreats(),list=s.threatFields.slice(0,30),now=Date.now();body.innerHTML=`<div class="panel-hero">🔫 <div><b>Heists</b><p>Bedrohte rote Felder können überfallen werden.</p></div></div><div class="panel-hint">🕵️ Verfügbare Schläger: <b>${Number(s.hitmen||0).toLocaleString('de-DE')}</b><br>⏱ Dauer: 30 Minuten · 🎲 Erfolg: 50 % · 💰 Beute: 50–100.000 $</div><h3>Bedrohte Ziele in deiner Umgebung</h3>${list.length?list.map(t=>{const h=s.heists.find(x=>x.cellId===t.cellId&&x.status==='running'),cd=cooldownUntil(t.cellId);return `<button class="panel-action heist-target-btn" data-heist="${t.cellId}">🔴 ${esc(t.name)} · ${esc(t.typeLabel)}<br><small>${h?'⚔ läuft · noch '+Math.ceil(Math.max(0,h.endsAt-now)/60000)+' Min.':cd>now?'🔒 Cooldown · '+Math.ceil((cd-now)/60000)+' Min.':'⚔ Überfall möglich'}</small></button>`}).join(''):'<div class="panel-hint">Keine bedrohten Ziele gefunden. Aktiviere GPS und öffne die Karte erneut.</div>'}`;body.querySelectorAll('[data-heist]').forEach(b=>b.onclick=()=>{const i=b.dataset.heist;const s2=read(),h=s2.heists?.find(x=>x.cellId===i&&x.status==='running');if(h||cooldownUntil(i)>Date.now())return toast(h?'Dieser Heist läuft bereits.':'Dieses Ziel ist noch im Cooldown.');start(i)});
  };
  const install=()=>{const root=document.getElementById('gameRoot');if(!root)return setTimeout(install,200);let n=0;const findMap=()=>{if(window.map&&window.L)return; if(++n<100)setTimeout(findMap,200)};findMap();if(!window.mtrwStartHeist)window.mtrwStartHeist=start;else{const old=window.mtrwStartHeist;window.mtrwStartHeist=id=>{if(start(id)===undefined)return;return old(id)}};
   const loop=()=>{const s=read();if(!s.worldOrigin)return;ensureThreats();resolve();if(window.map&&!window.mtrwHeistLayer){window.mtrwHeistLayer=L.layerGroup().addTo(window.map);renderTargets()}else if(window.mtrwHeistLayer)renderTargets();renderPanel()};
   setTimeout(loop,1200);setInterval(loop,5000);new MutationObserver(()=>{if(window.map&&!window.mtrwHeistLayer){window.mtrwHeistLayer=L.layerGroup().addTo(window.map);renderTargets()}renderPanel()}).observe(root,{subtree:true,childList:true});
  };
  install();
 });
})();