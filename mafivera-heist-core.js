/* MAFIVERA — gemeinsames Heist-System
   Stufe 1 = 5.000 | Stufe 2 = 10.000 | Stufe 3 = 15.000 Verteidigung
*/
(()=>{'use strict';
if(window.__mtrwHeistCoreUI)return; window.__mtrwHeistCoreUI=true;
let map=null,marker=null,timer=null,busy=false,lastId=null;

function css(){
 if(document.getElementById('mtrwHeistCoreCSS'))return;
 const s=document.createElement('style');s.id='mtrwHeistCoreCSS';s.textContent=`
 .mtrw-heist-core{position:fixed;left:50%;bottom:82px;transform:translateX(-50%);z-index:1800;width:min(430px,calc(100vw - 24px));background:#0b0d12f2;border:1px solid #7f1d1d;border-radius:16px;box-shadow:0 12px 35px #000b;color:#fff;padding:12px;backdrop-filter:blur(8px);font-family:system-ui,sans-serif}
 .mtrw-heist-core .top{display:flex;justify-content:space-between;gap:10px;align-items:center}.mtrw-heist-core .title{font-weight:900;font-size:16px}.mtrw-heist-core .lvl{font-weight:900;color:#f87171}.mtrw-heist-core .hptext{font-weight:900;font-size:13px}
 .mtrw-heist-core .bar{height:14px;background:#251014;border-radius:99px;overflow:hidden;border:1px solid #4b151b;margin:8px 0}.mtrw-heist-core .fill{height:100%;background:#dc2626;transition:width .35s ease}
 .mtrw-heist-core .meta{display:flex;justify-content:space-between;color:#cbd5e1;font-size:10px}.mtrw-heist-core .attack{margin-top:9px;width:100%;border:0;border-radius:11px;padding:11px;background:#991b1b;color:#fff;font-weight:900;font-size:13px}.mtrw-heist-core .attack:disabled{opacity:.55}
 .mtrw-heist-core .hint{font-size:10px;color:#94a3b8;margin-top:6px}.mtrw-heist-core .close{background:none;border:0;color:#94a3b8;font-size:18px}
 .mtrw-heist-core.hidden{display:none}
 .mtrw-heist-active-marker{background:transparent!important;border:0!important}.mtrw-heist-active-marker span{display:flex;align-items:center;justify-content:center;width:42px;height:42px;border-radius:50%;background:#17070ae8;border:2px solid #ef4444;box-shadow:0 0 18px #ef4444;font-size:22px}
 `;
 document.head.appendChild(s);
}
function panel(){
 let p=document.getElementById('mtrwHeistCore');if(p)return p;
 p=document.createElement('div');p.id='mtrwHeistCore';p.className='mtrw-heist-core hidden';document.body.appendChild(p);return p;
}
function toast(t,e=false){const x=document.getElementById('toast');if(!x)return;x.textContent=t;x.className='toast show '+(e?'error':'');clearTimeout(toast.t);toast.t=setTimeout(()=>x.className='toast',3000)}
function render(h){
 const p=panel(); if(!h?.active){p.classList.add('hidden');if(marker){try{map.removeLayer(marker)}catch(_){}marker=null}return}
 const pct=Math.max(0,Math.min(100,Number(h.current_hp)/Number(h.max_hp)*100));
 const skull='💀'.repeat(Number(h.level)||1);
 p.classList.remove('hidden');
 p.innerHTML=`<div class="top"><div><div class="title">💰 HEIST <span class="lvl">${skull} STUFE ${h.level}</span></div><div class="hptext">${Number(h.current_hp).toLocaleString('de-DE')} / ${Number(h.max_hp).toLocaleString('de-DE')} Verteidigung</div></div><button class="close" id="mtrwHeistClose">×</button></div>
 <div class="bar"><div class="fill" style="width:${pct}%"></div></div>
 <div class="meta"><span>Gemeinsame Verteidigung</span><span>${pct.toFixed(0)} %</span></div>
 <button class="attack" id="mtrwHeistAttack">🥊 Schläger zum Heist schicken</button>
 <div class="hint">Jeder Angriff senkt dieselbe Verteidigung für alle Spieler. Belohnung wird bei Erfolg anteilig nach Schaden verteilt.</div>`;
 p.querySelector('#mtrwHeistClose').onclick=()=>p.classList.add('hidden');
 p.querySelector('#mtrwHeistAttack').onclick=()=>attack(h.id);
 if(map&&Number.isFinite(Number(h.center_lat))&&Number.isFinite(Number(h.center_lng))){
   const pos=[Number(h.center_lat),Number(h.center_lng)];
   if(!marker)marker=L.marker(pos,{zIndexOffset:1400,icon:L.divIcon({className:'mtrw-heist-active-marker',html:'<span>💀</span>',iconSize:[46,46],iconAnchor:[23,23]})}).addTo(map);
   else marker.setLatLng(pos);
   marker.bindTooltip(`${skull} Heist · ${Number(h.current_hp).toLocaleString('de-DE')} / ${Number(h.max_hp).toLocaleString('de-DE')}`,{direction:'top'});
 }
}
async function state(){
 if(!window.db)return;
 try{const r=await window.db.rpc('mtrw_heist_spawn_or_state');if(r.error)throw r.error;render(r.data)}catch(e){console.warn('MAFIVERA Heist:',e)}
}
async function attack(id){
 if(busy||!window.db)return;
 const n=Number(prompt('Wie viele Schläger sollen zum Heist geschickt werden?','100'));if(!Number.isInteger(n)||n<1)return;
 busy=true;const b=document.getElementById('mtrwHeistAttack');if(b)b.disabled=true;
 try{
   const r=await window.db.rpc('mtrw_heist_attack',{p_heist_id:id,p_hitmen:n});if(r.error)throw r.error;
   if(r.data?.completed)toast('💰 HEIST ERFOLGREICH! Die Belohnungen wurden verteilt.');
   else toast(`🥊 ${Number(r.data?.damage||0).toLocaleString('de-DE')} Schaden verursacht.`);
   await state();
 }catch(e){
   const code=String(e?.message||'').replace(/^Error:\s*/i,'');
   toast(code==='not_enough_hitmen'?'Nicht genügend Schläger.':code||'Heist-Angriff fehlgeschlagen.',true);
 }finally{busy=false}
}
function boot(){if(typeof L==='undefined'||!window.__mtrwMap)return;map=window.__mtrwMap;css();panel();state();clearInterval(timer);timer=setInterval(state,5000)}
const wait=setInterval(()=>{if(window.__mtrwMap&&window.db){clearInterval(wait);boot()}},300);
setTimeout(()=>clearInterval(wait),30000);
})();