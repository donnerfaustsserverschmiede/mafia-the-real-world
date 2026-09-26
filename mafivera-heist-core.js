/* MAFIVERA — Heist-Kachel-System
   Heist wird ausschließlich über die angetippte Event-Kachel gestartet.
   30 Minuten Laufzeit, danach 60 Minuten Feld-Cooldown.
*/
(()=>{'use strict';
if(window.__mtrwHeistCoreUI)return; window.__mtrwHeistCoreUI=true;
let timer=null,currentZone=null,currentState=null;
function css(){if(document.getElementById('mtrwHeistCoreCSS'))return;const s=document.createElement('style');s.id='mtrwHeistCoreCSS';s.textContent=`
.mtrw-heist-dialog{position:fixed;inset:0;z-index:2147482000;background:#0009;display:flex;align-items:center;justify-content:center;padding:18px;font-family:system-ui,sans-serif}
.mtrw-heist-card{width:min(430px,100%);background:#0b0d12f8;color:#fff;border:1px solid #7f1d1d;border-radius:18px;box-shadow:0 18px 60px #000d;padding:16px}
.mtrw-heist-card .head{display:flex;align-items:center;justify-content:space-between;gap:10px}.mtrw-heist-card h2{margin:0;font-size:20px}.mtrw-heist-card .close{width:40px;height:40px;border-radius:50%;border:1px solid #475569;background:#151b24;color:#fff;font-size:25px}
.mtrw-heist-card .sector{color:#fca5a5;font-weight:900;font-size:13px;margin-top:5px;letter-spacing:.2px}.mtrw-heist-card .box{margin-top:12px;background:#151016;border:1px solid #5b1b21;border-radius:13px;padding:12px}
.mtrw-heist-card .skulls{font-size:27px;letter-spacing:2px}.mtrw-heist-card .hp{font-weight:900;font-size:17px;margin-top:5px}.mtrw-heist-card .bar{height:13px;background:#251014;border-radius:99px;overflow:hidden;border:1px solid #4b151b;margin:8px 0}.mtrw-heist-card .fill{height:100%;background:#dc2626}
.mtrw-heist-card .count{font-size:26px;font-weight:950;text-align:center;margin:14px 0;color:#fca5a5;text-shadow:0 0 12px #dc262655}.mtrw-heist-card .hint{font-size:11px;color:#94a3b8;line-height:1.4}
.mtrw-heist-card button.action{width:100%;margin-top:10px;padding:12px;border:0;border-radius:11px;background:#991b1b;color:#fff;font-weight:900;font-size:14px}.mtrw-heist-card button.action:disabled{opacity:.5}
.mtrw-heist-card .secondary{background:#1f2937!important}
`;document.head.appendChild(s)}
function dialog(){let d=document.getElementById('mtrwHeistDialog');if(d)return d;d=document.createElement('div');d.id='mtrwHeistDialog';d.className='mtrw-heist-dialog';document.body.appendChild(d);return d}
function fmt(sec){sec=Math.max(0,Math.floor(Number(sec)||0));const h=Math.floor(sec/3600),m=Math.floor(sec%3600/60),s=sec%60;return h?String(h).padStart(2,'0')+':'+String(m).padStart(2,'0')+':'+String(s).padStart(2,'0'):String(m).padStart(2,'0')+':'+String(s).padStart(2,'0')}
function toast(t,e=false){const x=document.getElementById('toast');if(!x)return;x.textContent=t;x.className='toast show '+(e?'error':'');clearTimeout(toast.t);toast.t=setTimeout(()=>x.className='toast',3000)}
async function getState(zone){
  let last=null;
  for(let attempt=0;attempt<3;attempt++){
    try{
      let r=await window.db.rpc('mtrw_heist_field_state',{p_zone_key:zone});
      if(r.error)throw r.error;
      if(r.data?.eligible===false){
        const reg=await window.db.rpc('mtrw_register_heist_field',{p_zone_key:zone});
        if(reg.error)throw reg.error;
        r=await window.db.rpc('mtrw_heist_field_state',{p_zone_key:zone});
        if(r.error)throw r.error;
      }
      if(r.data?.eligible===false)throw Object.assign(new Error('heist_field_not_registered'),{code:'heist_field_not_registered'});
      return r.data;
    }catch(e){
      last=e;
      if(attempt<2)await new Promise(resolve=>setTimeout(resolve,250*(attempt+1)));
    }
  }
  throw last||new Error('heist_state_unavailable');
}
function close(){clearInterval(timer);timer=null;currentZone=null;currentState=null;const d=document.getElementById('mtrwHeistDialog');if(d)d.remove()}
function sectorLabel(zone){const p=String(zone||'').replace(/^z_/,'').split('_');return p.length>=2?`Sektor ${p[0]}, ${p[1]}`:`Sektor ${zone}`}
function render(state,count){currentState=state;const d=dialog(),zone=currentZone;const skulls=state?.active?'💀'.repeat(Number(state.level)||1):'💀';let body='';
if(state?.active){const pct=Math.max(0,Math.min(100,Number(state.current_hp)/Number(state.max_hp)*100));body=`<div class="box"><div class="skulls">${skulls}</div><div><b>Heist läuft</b> · Stufe ${state.level}</div><div class="hp">${Number(state.current_hp).toLocaleString('de-DE')} / ${Number(state.max_hp).toLocaleString('de-DE')} Verteidigung</div><div class="bar"><div class="fill" style="width:${pct}%"></div></div><div class="hint">Gemeinsame Verteidigung für alle Spieler. Laufzeit endet nach 30 Minuten.</div><div class="count" id="heistCountdown">Heist endet in ${fmt(state.remaining_seconds)}</div><button class="action" id="heistAttack">🥊 Schläger zum Heist schicken</button></div>`}else if(state?.cooldown){body=`<div class="box"><div class="skulls">💀</div><b>Heist abgeschlossen</b><div class="count" id="heistCountdown">Heist startet in ${fmt(state.remaining_seconds)}</div><div class="hint">Dieses Event-Feld ist nach einem Heist 60 Minuten gesperrt. Danach kann hier der nächste Heist gestartet werden.</div></div>`}else{body=`<div class="box"><div class="skulls">💀</div><b>Heist-Ziel verfügbar</b><div class="count" id="heistCountdown">Heist startet in ${fmt(state?.remaining_seconds)}</div><div class="hint">Jedes Heist-Feld hat einen eigenen, versetzten Countdown. Sobald er 00:00 erreicht, startet der Heist automatisch.</div></div>`}
d.innerHTML=`<div class="mtrw-heist-card"><div class="head"><div><h2>💀 HEIST</h2><div class="sector">${sectorLabel(zone)}</div></div><button class="close" id="heistClose">×</button></div>${body}<button class="action secondary" id="heistBack">Schließen</button></div>`;
d.querySelector('#heistClose').onclick=close;d.querySelector('#heistBack').onclick=close;

const attack=d.querySelector('#heistAttack');if(attack)attack.onclick=async()=>{const n=Number(prompt('Wie viele Schläger sollen zum Heist geschickt werden?','100'));if(!Number.isInteger(n)||n<1)return;attack.disabled=true;try{const r=await window.db.rpc('mtrw_heist_march',{p_heist_id:state.id,p_hitmen:n});if(r.error)throw r.error;toast(`🥊 ${n.toLocaleString('de-DE')} Schläger marschieren zum Heist. Ankunft in ${fmt(r.data?.travel_seconds)}.`);render(await getState(zone),count)}catch(e){const msg=String(e?.message||'');toast(msg==='not_enough_hitmen'?'Nicht genügend Schläger.':msg==='heist_too_far'?'Du bist zu weit entfernt. Der Heist liegt außerhalb deines Radarkreises.':msg==='location_required'?'Dein aktueller Standort ist noch nicht verfügbar.':msg==='heist_expired'?'Der Heist ist abgelaufen.':msg||'Heist-Marsch konnte nicht gestartet werden.',true);attack.disabled=false}};
clearInterval(timer);if(state?.eligible){timer=setInterval(async()=>{try{const next=await getState(zone);if(document.getElementById('mtrwHeistDialog'))render(next,count)}catch(_){}},1000)}
}
window.mtrwOpenHeistField=async function(zone,count){
  if(!window.db)return;
  currentZone=zone;css();const d=dialog();
  d.innerHTML='<div class="mtrw-heist-card"><div class="head"><div><h2>💀 HEIST</h2><div class="sector">'+sectorLabel(zone)+'</div></div><button class="close" id="heistClose">×</button></div><div class="box">Heist-Daten werden geladen…</div></div>';
  d.querySelector('#heistClose').onclick=close;
  try{
    const state=await getState(zone);
    if(currentZone===zone)render(state,count);
  }catch(e){
    const code=String(e?.code||e?.message||'').replace(/^Error:\s*/i,'');
    const msg=code==='heist_field_not_registered'
      ?'Dieses Heistfeld ist serverseitig noch nicht registriert. Bitte einmal neu laden.'
      :'Heist-Daten konnten nicht geladen werden.';
    toast(msg,true);close();
  }
};
})();