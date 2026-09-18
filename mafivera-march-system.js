/* MAFIVERA — isolated march & attack system
   Keeps the stable map/runtime untouched. Server-authoritative via Supabase RPCs.
*/
(()=>{'use strict';
if(window.__mtrwMarchSystem)return;window.__mtrwMarchSystem=true;

const BUILD='20260918-march1';
let db=null, timer=null, markerTimer=null, busy=false, markers=[];
const $=id=>document.getElementById(id);
const fmt=n=>Number(n||0).toLocaleString('de-DE');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const toast=(t,e=false)=>{const x=$('toast');if(!x)return;x.textContent=t;x.className='toast show '+(e?'error':'');clearTimeout(toast.t);toast.t=setTimeout(()=>x.className='toast',3000)};
const zoneLabel=z=>{const m=/^z_(-?\\d+)_(-?\\d+)$/.exec(z||'');if(!m)return z;const r=+m[1],c=+m[2];return `Sektor ${r>=0?'N':'S'}${Math.abs(r)}-${c>=0?'O':'W'}${Math.abs(c)}`};
const clearMarkers=()=>{markers.forEach(m=>m.remove());markers=[]};
const waitForRuntime=()=>new Promise(resolve=>{let n=0;const tick=()=>{db=window.db;const map=window.__mtrwMap;if(db&&map&&window.L&&$('drawer'))return resolve();if(++n>240)return;setTimeout(tick,250)};tick()});

function style(){
 if($('mtrwMarchCSS'))return;
 const s=document.createElement('style');s.id='mtrwMarchCSS';s.textContent=`
 .mtrw-march-marker{background:transparent!important;border:0!important;width:52px!important;height:38px!important;display:flex!important;align-items:center!important;justify-content:center!important;position:relative}
 .mtrw-march-marker .mtrw-march-icon{font-size:27px;filter:drop-shadow(0 2px 4px #000)}
 .mtrw-march-marker b{position:absolute;right:-2px;top:-2px;min-width:22px;padding:3px 5px;border-radius:9px;background:#101820eF;border:1px solid #f0b53c;color:#fff;font:900 10px/1 system-ui;text-align:center}
 .mtrw-march-panel{margin:10px 0;padding:12px;border:1px solid #34404d;border-radius:15px;background:#121923}
 .mtrw-march-panel h3{margin:0 0 8px;font-size:14px}
 .mtrw-march-card{padding:9px 10px;margin-top:6px;border:1px solid #293542;border-radius:11px;background:#171f2a}
 .mtrw-march-card b{display:block;font-size:12px}.mtrw-march-card small{display:block;color:#8e9aaa;margin-top:3px;font-size:9px}
 .mtrw-attack-overlay{position:fixed;inset:0;z-index:120000;background:#000b;display:flex;align-items:flex-end;justify-content:center;padding:12px}
 .mtrw-attack-card{width:min(520px,100%);background:#101720;border:1px solid #394653;border-radius:22px;padding:18px;box-shadow:0 25px 80px #000c;color:#fff}
 .mtrw-attack-card h2{margin:0 0 5px;font-size:22px}.mtrw-attack-card p{margin:0 0 13px;color:#9ba6b4;font-size:12px;line-height:1.45}
 .mtrw-attack-card label{display:block;color:#aeb8c5;font-size:11px;font-weight:800;margin-bottom:6px}
 .mtrw-attack-card input{width:100%;height:50px;border:1px solid #394653;border-radius:12px;background:#080d14;color:#fff;padding:0 13px;font-size:18px;box-sizing:border-box}
 .mtrw-attack-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}.mtrw-attack-actions button{height:48px;border-radius:12px;border:1px solid #3c4855;background:#202a35;color:#fff;font-weight:900}.mtrw-attack-actions .go{background:#7c2925;border-color:#c05b52}
 @media(min-width:700px){.mtrw-attack-overlay{align-items:center}.mtrw-attack-card{border-radius:24px}}
 `;document.head.appendChild(s)
}

async function loadMarches(){
 if(!db||!window.__mtrwMap)return;
 try{
   await db.rpc('mtrw_process_marches');
   const q=await db.from('mtrw_marches')
     .select('id,target_zone_key,troop_count,purpose,started_at,arrival_at,start_lat,start_lng,target_lat,target_lng,status')
     .eq('status','marching');
   if(q.error)throw q.error;
   clearMarkers();
   const now=Date.now();
   (q.data||[]).forEach(m=>{
     const st=new Date(m.started_at).getTime(),at=new Date(m.arrival_at).getTime();
     const p=Math.max(0,Math.min(1,(now-st)/(at-st||1)));
     const lat=Number(m.start_lat)+(Number(m.target_lat)-Number(m.start_lat))*p;
     const lng=Number(m.start_lng)+(Number(m.target_lng)-Number(m.start_lng))*p;
     const icon=L.divIcon({className:'mtrw-march-marker',html:`<span class="mtrw-march-icon">${m.purpose==='attack'?'⚔️':'👥'}</span><b>${fmt(m.troop_count)}</b>`,iconSize:[52,38],iconAnchor:[26,19]});
     markers.push(L.marker([lat,lng],{icon,zIndexOffset:800}).addTo(window.__mtrwMap));
   });
 }catch(e){console.warn('[MAFIVERA march]',e)}
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
 const q=await db.from('mtrw_marches').select('id,target_zone_key,troop_count,purpose,started_at,arrival_at').eq('status','marching').order('arrival_at');
 if(q.error)return;
 const box=document.createElement('section');box.id='mtrwMarchPanel';box.className='mtrw-march-panel';
 box.innerHTML='<h3>⚔️ Aktive Märsche</h3>';
 const rows=q.data||[];
 if(!rows.length)box.innerHTML+='<small style="color:#8e9aaa">Keine aktiven Märsche.</small>';
 rows.forEach(m=>{const card=document.createElement('div');card.className='mtrw-march-card';card.dataset.arrival=m.arrival_at;card.innerHTML=`<b>${m.purpose==='attack'?'⚔️ Angriff':'👥 Trupp'} → ${esc(zoneLabel(m.target_zone_key))}</b><small data-countdown>Berechnung… · ${fmt(m.troop_count)} Schläger</small>`;box.appendChild(card)});
 body.prepend(box);
}

function updatePanelCountdown(){
 document.querySelectorAll('.mtrw-march-card').forEach(c=>{const t=new Date(c.dataset.arrival).getTime();const left=Math.max(0,t-Date.now());const mins=Math.floor(left/60000),secs=Math.ceil((left%60000)/1000);const x=c.querySelector('[data-countdown]');if(x)x.textContent=`${mins}m ${String(secs).padStart(2,'0')}s · ${c.querySelector('b')?.textContent?.split('→')[0]||''}`});
}

async function boot(){
 style();interceptAttacks();
 await waitForRuntime();
 await loadMarches();
 timer=setInterval(loadMarches,5000);
 markerTimer=setInterval(()=>{loadMarches();updatePanelCountdown()},1000);
 const observer=new MutationObserver(()=>{renderMarchPanel()});
 const body=$('drawerBody');if(body)observer.observe(body,{childList:true,subtree:true});
}
boot().catch(e=>console.warn('[MAFIVERA march boot]',e));
})();