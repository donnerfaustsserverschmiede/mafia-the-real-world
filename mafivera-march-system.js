/* MAFIVERA — isolated march & attack system
   Keeps the stable map/runtime untouched. Server-authoritative via Supabase RPCs.
*/
(()=>{'use strict';
if(window.__mtrwMarchSystem)return;window.__mtrwMarchSystem=true;

const BUILD='20260918-battle1';
let db=null, timer=null, markerTimer=null, busy=false, markers=new Map(),marchCache=[];
const $=id=>document.getElementById(id);
const fmt=n=>Number(n||0).toLocaleString('de-DE');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const toast=(t,e=false)=>{const x=$('toast');if(!x)return;x.textContent=t;x.className='toast show '+(e?'error':'');clearTimeout(toast.t);toast.t=setTimeout(()=>x.className='toast',3000)};
const zoneLabel=z=>{const m=/^z_(-?\\d+)_(-?\\d+)$/.exec(z||'');if(!m)return z;const r=+m[1],c=+m[2];return `Sektor ${r>=0?'N':'S'}${Math.abs(r)}-${c>=0?'O':'W'}${Math.abs(c)}`};
const clearMarkers=()=>{markers.forEach(m=>m.remove());markers.clear()};
const waitForRuntime=()=>new Promise(resolve=>{let n=0;const tick=()=>{db=window.db;const map=window.__mtrwMap;if(db&&map&&window.L&&$('drawer'))return resolve();if(++n>240)return;setTimeout(tick,250)};tick()});

function style(){

 if($('mtrwMarchCSS'))return;
 const s=document.createElement('style');s.id='mtrwMarchCSS';s.textContent=`
 .mtrw-march-marker{background:transparent!important;border:0!important;width:52px!important;height:38px!important;display:flex!important;align-items:center!important;justify-content:center!important;position:relative}
 .mtrw-march-marker .mtrw-march-icon{display:block;width:30px;height:32px;line-height:32px;text-align:center;font-size:27px;transform:none!important}
 .mtrw-march-menu-btn{position:absolute;left:10px;top:74px;z-index:1000;height:42px;min-width:132px;padding:0 13px;border:1px solid #465361;border-radius:12px;background:#101820ed;color:#fff;box-shadow:0 5px 18px #0008;font:900 11px/1 system-ui;display:flex;align-items:center;gap:7px}
 .mtrw-march-menu-btn .count{display:inline-grid;place-items:center;min-width:21px;height:21px;border-radius:50%;background:#7c2925;border:1px solid #c05b52;font-size:10px}
 .mtrw-march-menu-btn.empty .count{background:#202a35;border-color:#465361}
 .mtrw-march-menu{margin:0 0 12px;padding:12px;border:1px solid #34404d;border-radius:15px;background:#121923}
 .mtrw-march-overview{position:absolute;left:10px;top:0;z-index:1200;width:min(285px,calc(100% - 20px));max-height:34vh;overflow:auto;padding:10px;border:1px solid #3a4652;border-radius:14px;background:#0b1119e8;backdrop-filter:blur(8px);box-shadow:0 8px 24px #0008;color:#fff;pointer-events:auto;font-family:system-ui,sans-serif;box-sizing:border-box}.mtrw-march-overview h3{margin:0 0 7px;font-size:12px}.mtrw-march-overview .march-row{padding:8px 0;border-top:1px solid #27313c}.mtrw-march-overview .march-row:first-of-type{border-top:0}.mtrw-march-overview b{font-size:11px}.mtrw-march-overview small{display:block;color:#9aa6b5;font-size:9px;margin-top:2px}.mtrw-march-overview .recall{margin-top:5px;width:100%;height:28px;border:1px solid #8b3c35;border-radius:8px;background:#5e2421;color:#fff;font-size:9px;font-weight:900}.mtrw-march-overview .recall:disabled{opacity:.5}
 .mtrw-march-menu h3{margin:0 0 8px;font-size:14px}
 .mtrw-march-row{padding:10px;margin-top:7px;border:1px solid #293542;border-radius:12px;background:#171f2a}
 .mtrw-march-row b{display:block;font-size:12px}
 .mtrw-march-row small{display:block;color:#8e9aaa;margin-top:4px;font-size:9px}
 .mtrw-march-row .withdraw{margin-top:8px;width:100%;height:36px;border-radius:9px;border:1px solid #a94b45;background:#55211f;color:#fff;font-weight:900;font-size:11px}
 @media(max-width:700px){.mtrw-march-menu-btn{top:72px;left:9px;height:40px}}

 .mtrw-march-marker .mtrw-march-icon{font-size:27px;filter:drop-shadow(0 2px 4px #000)}
 .mtrw-march-marker b{position:absolute;right:-2px;top:-2px;min-width:22px;padding:3px 5px;border-radius:9px;background:#101820eF;border:1px solid #f0b53c;color:#fff;font:900 10px/1 system-ui;text-align:center}
 .mtrw-march-panel{margin:10px 0;padding:12px;border:1px solid #34404d;border-radius:15px;background:#121923}
 .mtrw-march-panel h3{margin:0 0 8px;font-size:14px}
 .mtrw-march-card{padding:9px 10px;margin-top:6px;border:1px solid #293542;border-radius:11px;background:#171f2a}
 .mtrw-march-card b{display:block;font-size:12px}.mtrw-march-card small{display:block;color:#8e9aaa;margin-top:3px;font-size:9px}.mtrw-march-card.battle{border-color:#9d3f36;box-shadow:0 0 0 1px #9d3f3622 inset}.mtrw-march-card.battle small{color:#f0b53c;font-weight:800}
 .mtrw-attack-overlay{position:fixed;inset:0;z-index:120000;background:#000b;display:flex;align-items:flex-end;justify-content:center;padding:12px}
 .mtrw-attack-card{width:min(520px,100%);background:#101720;border:1px solid #394653;border-radius:22px;padding:18px;box-shadow:0 25px 80px #000c;color:#fff}
 .mtrw-attack-card h2{margin:0 0 5px;font-size:22px}.mtrw-attack-card p{margin:0 0 13px;color:#9ba6b4;font-size:12px;line-height:1.45}
 .mtrw-attack-card label{display:block;color:#aeb8c5;font-size:11px;font-weight:800;margin-bottom:6px}
 .mtrw-attack-card input{width:100%;height:50px;border:1px solid #394653;border-radius:12px;background:#080d14;color:#fff;padding:0 13px;font-size:18px;box-sizing:border-box}
 .mtrw-attack-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}.mtrw-attack-actions button{height:48px;border-radius:12px;border:1px solid #3c4855;background:#202a35;color:#fff;font-weight:900}.mtrw-attack-actions .go{background:#7c2925;border-color:#c05b52}
 @media(min-width:700px){.mtrw-attack-overlay{align-items:center}.mtrw-attack-card{border-radius:24px}}
 `;document.head.appendChild(s)
}

function positionOverview(){const root=document.getElementById('mfMap'),legend=document.querySelector('.mf-legend'),box=document.getElementById('mtrwMarchOverview');if(root&&legend&&box)box.style.top=(legend.offsetTop+legend.offsetHeight+30)+'px'}
function updateOverview(rows){
 const root=document.getElementById('mfMap');if(!root)return;
 let box=document.getElementById('mtrwMarchOverview');
 if(!box){box=document.createElement('section');box.id='mtrwMarchOverview';box.className='mtrw-march-overview';root.appendChild(box)}
 positionOverview();
 const now=Date.now();
 box.innerHTML='<h3>⚔️ Marschübersicht</h3>'+(rows.length?rows.map(m=>{const battle=m.status==='battle',raw=battle?m.battle_finish_at:m.arrival_at,left=Math.max(0,new Date(raw).getTime()-now),sec=Math.ceil(left/1000);return `<div class="march-row"><b>${battle?'⚔️ Kampf':'↠ '+(m.purpose==='attack'?'⚔️ Angriff':'👥 Truppen')} → ${esc(zoneLabel(m.target_zone_key))}</b><small>${fmt(m.troop_count)} Schläger · ${battle?'Kampf noch '+sec+' Sek.':'Ankunft in '+Math.floor(sec/60)+'m '+String(sec%60).padStart(2,'0')+'s'}</small><button class="recall" data-march-id="${m.id}">↩️ Marsch zurückrufen</button></div>`}).join(''):'<small>Keine aktiven Märsche.</small>');
 box.querySelectorAll('[data-march-id]').forEach(b=>b.onclick=async()=>{if(b.disabled)return;b.disabled=true;try{const r=await db.rpc('mtrw_withdraw_march',{p_march_id:b.dataset.marchId});if(r.error)throw r.error;toast(`↩️ Marsch zurückgerufen · ${fmt(r.data?.troops_returned||0)} Schläger zurück`);await loadMarches()}catch(e){toast(String(e.message||e).replace(/^Error:\s*/i,''),true);b.disabled=false}});
}

async function loadMarches(){
 if(!db||!window.__mtrwMap)return;
 try{
   await db.rpc('mtrw_process_marches');
   const q=await db.from('mtrw_marches')
     .select('id,target_zone_key,troop_count,purpose,started_at,arrival_at,battle_started_at,battle_finish_at,start_lat,start_lng,target_lat,target_lng,status,result')
     .eq('user_id',(await db.auth.getUser()).data.user?.id||'')
     .in('status',['marching','battle'])
     .order('arrival_at',{ascending:true});
   if(q.error)throw q.error;
   const previous=marchCache;
   marchCache=q.data||[];
   const activeIds=new Set(marchCache.map(x=>x.id));
   previous.filter(x=>!activeIds.has(x.id)).forEach(x=>window.dispatchEvent(new CustomEvent('mtrw:march-finished',{detail:x})));
   updateMarchButton();
   const active=new Set(marchCache.map(m=>m.id));
   markers.forEach((marker,id)=>{if(!active.has(id)){marker.remove();markers.delete(id)}});
   const now=Date.now();
   marchCache.forEach(m=>{
     let lat=Number(m.target_lat),lng=Number(m.target_lng);
     if(m.status==='marching'){
       const st=new Date(m.started_at).getTime(),at=new Date(m.arrival_at).getTime();
       const p=Math.max(0,Math.min(1,(now-st)/(at-st||1)));
       lat=Number(m.start_lat)+(Number(m.target_lat)-Number(m.start_lat))*p;
       lng=Number(m.start_lng)+(Number(m.target_lng)-Number(m.start_lng))*p;
     }
     const battle=m.status==='battle';
     const icon=L.divIcon({
       className:'mtrw-march-marker',
       html:`<span class="mtrw-march-icon">${battle?'⚔️':(m.purpose==='attack'?'⚔️':'👥')}</span><b>${fmt(m.troop_count)}</b>`,
       iconSize:[52,38],iconAnchor:[26,19]
     });
     let marker=markers.get(m.id);
     if(!marker){
       marker=L.marker([lat,lng],{icon,zIndexOffset:800,interactive:false}).addTo(window.__mtrwMap);
       marker.__mtrwPhase=m.status;marker.__mtrwTroops=m.troop_count;marker.__mtrwPurpose=m.purpose;
       markers.set(m.id,marker);
     }else{
       marker.setLatLng([lat,lng]);
       if(marker.__mtrwPhase!==m.status||marker.__mtrwTroops!==m.troop_count||marker.__mtrwPurpose!==m.purpose){
         marker.setIcon(icon);
         marker.__mtrwPhase=m.status;marker.__mtrwTroops=m.troop_count;marker.__mtrwPurpose=m.purpose;
       }
     }
   });
 }catch(e){console.warn('[MAFIVERA march]',e)}
}

function updateMarchButton(){
 const b=$('mtrwMarchMenuBtn');if(!b)return;
 const n=marchCache.length;b.querySelector('.count').textContent=String(n);b.classList.toggle('empty',n===0);
}
function renderMarchMenu(){
 const title=$('drawerTitle'),body=$('drawerBody');if(!title||!body)return;
 title.textContent='Märsche';
 const rows=marchCache;
 body.innerHTML='<section class="mtrw-march-menu"><h3>⚔️ Aktive Märsche</h3>'+
   (rows.length?rows.map(m=>'<div class="mtrw-march-row" data-march="'+m.id+'"><b>'+esc(m.status==='battle'?'⚔️ KAMPF':'↠ '+(m.purpose==='attack'?'⚔️ Angriff':'👥 Trupp'))+' → '+esc(zoneLabel(m.target_zone_key))+'</b><small data-countdown></small><button class="withdraw" data-withdraw="'+m.id+'">↩️ Truppen zurückziehen · '+fmt(m.troop_count)+'</button></div>').join(''):'<div class="hint">Keine aktiven Märsche. 0 Märsche.</div>')+
   '</section>';
 rows.forEach(m=>{const row=body.querySelector('[data-march="'+m.id+'"]');if(row){row.dataset.status=m.status;row.dataset.arrival=m.arrival_at;row.dataset.battleFinish=m.battle_finish_at||'';}});
 body.querySelectorAll('[data-withdraw]').forEach(btn=>btn.onclick=async()=>{
   btn.disabled=true;
   try{const r=await db.rpc('mtrw_withdraw_march',{p_march_id:btn.dataset.withdraw});if(r.error)throw r.error;toast('↩️ '+fmt(r.data?.troops_returned||0)+' Schläger zurückgezogen.');await loadMarches();renderMarchMenu();updatePanelCountdown()}
   catch(e){btn.disabled=false;toast(String(e.message||e).replace(/^Error:\s*/i,''),true)}
 });
 updatePanelCountdown();
}
function ensureMarchButton(){
 if($('mtrwMarchMenuBtn'))return;
 const root=document.querySelector('.mf-app');if(!root)return;
 const b=document.createElement('button');b.id='mtrwMarchMenuBtn';b.className='mtrw-march-menu-btn empty';b.innerHTML='⚔️ Märsche <span class="count">0</span>';
 b.onclick=renderMarchMenu;root.appendChild(b);updateMarchButton();
}
async function startAttack(zone){
 if(busy)return;busy=true;
 try{
   const u=await db.auth.getUser();if(u.error)throw u.error;if(!u.data?.user?.id)throw Error('Keine Sitzung gefunden.');const p=await db.from('profiles').select('hitmen,level').eq('id',u.data.user.id).single();
   if(p.error)throw p.error;
   const available=Number(p.data?.hitmen||0);
   if(available<1)throw Error('Keine freien Schläger verfügbar.');
   const overlay=document.createElement('div');overlay.className='mtrw-attack-overlay';
   overlay.innerHTML=`<section class="mtrw-attack-card">
     <h2>⚔️ Angriff vorbereiten</h2>
     <p>Zielfeld: <b>${esc(zoneLabel(zone))}</b><br>Die Schläger starten vom Hauptquartier. Die Marschzeit wird serverseitig berechnet.</p>
     <label for="mtrwAttackCount">Schläger einsetzen · verfügbar: ${fmt(available)}</label>
     <input id="mtrwAttackCount" type="number" min="1" max="${available}" value="${Math.min(10,available)}" inputmode="numeric">
     <div class="mtrw-attack-actions"><button type="button" class="cancel">Abbrechen</button><button type="button" class="go">⚔️ Marsch starten</button></div>
   </section>`;
   document.body.appendChild(overlay);
   const close=()=>overlay.remove();
   overlay.querySelector('.cancel').onclick=close;
   overlay.addEventListener('click',e=>{if(e.target===overlay)close()});
   const input=overlay.querySelector('#mtrwAttackCount');input.focus();input.select();
   overlay.querySelector('.go').onclick=async()=>{
     const n=Math.floor(Number(input.value)||0);
     if(n<1||n>available)return toast('Ungültige Anzahl Schläger.',true);
     overlay.querySelector('.go').disabled=true;
     try{
       const r=await db.rpc('mafivera_attack',{p_zone_key:zone,p_count:n});
       if(r.error)throw r.error;
       close();
       const d=r.data||{};
       const mins=Math.max(1,Math.ceil(Number(d.travel_seconds||60)/60));
       toast(`⚔️ Angriffsmarsch gestartet · ${n} Schläger · ca. ${mins} Min.`);
       await loadMarches();
       document.dispatchEvent(new CustomEvent('mtrw:march-started',{detail:d}));
     }catch(e){overlay.querySelector('.go').disabled=false;toast(String(e.message||e).replace(/^Error:\\s*/i,''),true)}
   };
 }catch(e){toast(String(e.message||e).replace(/^Error:\\s*/i,''),true)}
 finally{busy=false}
}

function interceptAttacks(){
 document.addEventListener('click',e=>{
   const b=e.target.closest?.('[data-action="attack"]');if(!b)return;
   const zone=b.dataset.zone;if(!zone)return;
   e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
   startAttack(zone);
 },true);
}

async function renderMarchPanel(){
 const title=$('drawerTitle'),body=$('drawerBody');if(!title||!body||title.textContent!=='Schläger')return;
 if(body.querySelector('#mtrwMarchPanel'))return;
 const q=await db.from('mtrw_marches')
   .select('id,target_zone_key,troop_count,purpose,started_at,arrival_at,battle_started_at,battle_finish_at,status')
   .in('status',['marching','battle']).order('arrival_at');
 if(q.error)return;
 const box=document.createElement('section');box.id='mtrwMarchPanel';box.className='mtrw-march-panel';
 box.innerHTML='<h3>⚔️ Aktive Märsche & Kämpfe</h3>';
 const rows=q.data||[];
 if(!rows.length)box.innerHTML+='<small style="color:#8e9aaa">Keine aktiven Märsche.</small>';
 rows.forEach(m=>{
   const battle=m.status==='battle';
   const card=document.createElement('div');card.className='mtrw-march-card'+(battle?' battle':'');
   card.dataset.arrival=m.arrival_at;card.dataset.status=m.status;card.dataset.battleFinish=m.battle_finish_at||'';
   card.innerHTML=`<b>${battle?'⚔️ KAMPF':'↠ '+(m.purpose==='attack'?'⚔️ Angriff':'👥 Trupp')} → ${esc(zoneLabel(m.target_zone_key))}</b><small data-countdown>Berechnung… · ${fmt(m.troop_count)} Schläger</small>`;
   box.appendChild(card);
 });
 body.prepend(box);
}

function updatePanelCountdown(){
 document.querySelectorAll('.mtrw-march-card,.mtrw-march-row').forEach(c=>{
   const battle=c.dataset.status==='battle';
   const raw=battle?c.dataset.battleFinish:c.dataset.arrival;
   if(!raw)return;
   const t=new Date(raw).getTime(),left=Math.max(0,t-Date.now());
   const mins=Math.floor(left/60000),secs=Math.ceil((left%60000)/1000);
   const x=c.querySelector('[data-countdown]');
   if(!x)return;
   x.textContent=battle
     ? `🔥 Kampf läuft noch ${mins}m ${String(secs).padStart(2,'0')}s`
     : `Marsch noch ${mins}m ${String(secs).padStart(2,'0')}s`;
 });
}

async function boot(){
 style();interceptAttacks();
 await waitForRuntime();
 await loadMarches();
 ensureMarchButton();
 timer=setInterval(loadMarches,5000);
 markerTimer=setInterval(()=>{loadMarches();updatePanelCountdown();if($('drawerTitle')?.textContent==='Märsche')renderMarchMenu()},1000);
 const observer=new MutationObserver(()=>{renderMarchPanel()});
 const body=$('drawerBody');if(body)observer.observe(body,{childList:true,subtree:true});
}
boot().catch(e=>console.warn('[MAFIVERA march boot]',e));
})();