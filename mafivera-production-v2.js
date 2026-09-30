/* MAFIVERA — unified production UI
   One production controller for drugs + weapons.
   Resources are deducted server-side and every running job is shown with a live countdown. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const fmt=n=>Number(n||0).toLocaleString('de-DE');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const recipes={
 weed:{name:'Cannabis',resource:'Material',cost:10,value:50,seconds:10,kind:'drug'},
 cocaine:{name:'Kokain',resource:'Material',cost:25,value:100,seconds:15,kind:'drug'},
 meth:{name:'Methamphetamin',resource:'Material',cost:40,value:190,seconds:20,kind:'drug'},
 heroin:{name:'Heroin',resource:'Material',cost:60,value:300,seconds:30,kind:'drug'},
 weapon_melee:{name:'Hieb- und Stichwaffen',resource:'Waffenteile',cost:10,value:300,seconds:30,kind:'weapon'},
 weapon_handgun:{name:'Handfeuerwaffen',resource:'Waffenteile',cost:25,value:700,seconds:60,kind:'weapon'},
 weapon_smg:{name:'Kleine Langwaffen / Maschinenpistolen',resource:'Waffenteile',cost:50,value:1400,seconds:120,kind:'weapon'},
 weapon_longarm:{name:'Langwaffen',resource:'Waffenteile',cost:100,value:2200,seconds:240,kind:'weapon'}
};
let timer=null,openToken=0;
async function rpc(name,args={}){const r=await window.db.rpc(name,args);if(r.error)throw r.error;return r.data}
function panel(html){const d=$('drawer'),t=$('drawerTitle'),b=$('drawerBody');if(!d||!t||!b)return;t.textContent='Produktion';b.innerHTML=html;d.classList.remove('hidden')}
function stopTimer(){if(timer){clearInterval(timer);timer=null}}
function remainingText(ms){
 const s=Math.max(0,Math.ceil(ms/1000)),h=Math.floor(s/3600),m=Math.floor((s%3600)/60),sec=s%60;
 return h?String(h).padStart(2,'0')+':'+String(m).padStart(2,'0')+':'+String(sec).padStart(2,'0'):String(m).padStart(2,'0')+':'+String(sec).padStart(2,'0');
}
async function collect(){try{return await rpc('mtrw_collect_production')}catch(e){return null}}
async function getState(){
 try{await collect()}catch(e){}

 const boot=await rpc('mafivera_bootstrap'),p=boot?.profile||{};
 const q=await db.from('mtrw_production_jobs').select('id,drug_type,quantity,material_cost,resource_cost_type,started_at,finish_at,status').eq('user_id',p.id).eq('status','running').order('finish_at',{ascending:true});
 if(q.error)throw q.error;
 const factoryQ=await db.from('world_territories').select('building_level,building_finish_at').eq('owner_id',p.id).eq('building_type','weapon_factory').order('building_level',{ascending:false}).limit(1).maybeSingle();
 if(factoryQ.error)throw factoryQ.error;
 const factory=Number(factoryQ.data?.building_level||0);
 const factoryReady=!!factoryQ.data&&(!factoryQ.data.building_finish_at||new Date(factoryQ.data.building_finish_at)<=new Date());
 const di=await db.from('mtrw_drug_inventory').select('quantity').eq('user_id',p.id);
 if(di.error)throw di.error;
 const drugs=(di.data||[]).reduce((sum,x)=>sum+Number(x.quantity||0),0);
 const wi=await db.from('mtrw_weapon_inventory').select('melee,handguns,smgs,longarms').eq('user_id',p.id).maybeSingle();
 if(wi.error)throw wi.error;
 const weapons=Number(wi.data?.melee||0)+Number(wi.data?.handguns||0)+Number(wi.data?.smgs||0)+Number(wi.data?.longarms||0);
 return {p,jobs:q.data||[],factory,factoryReady,drugs,weapons};
}
function jobCard(j){
 const r=recipes[j.drug_type]||{name:j.drug_type,resource:j.resource_cost_type==='weapon_parts'?'Waffenteile':'Material'};
 const weapon=r.kind==='weapon'||j.drug_type?.startsWith('weapon_');
 return '<div class="task-card" data-job-id="'+j.id+'" data-finish="'+new Date(j.finish_at).getTime()+'">'+
   '<div><b>'+(weapon?'🏭':'⚗️')+' '+esc(r.name)+' · '+fmt(j.quantity)+' Stück</b>'+
   '<small>'+esc(r.resource|| (weapon?'Waffenteile':'Material'))+': '+fmt(j.material_cost)+' · <span data-job-countdown>Berechnung…</span></small></div>'+
   '<button class="mini danger" data-cancel-prod="'+j.id+'">✖ Abbrechen</button></div>';
}
function info(r,n){const cost=r.cost*n,sec=r.seconds*n;return fmt(cost)+' '+r.resource+' benötigt · Produktionszeit '+remainingText(sec*1000)+' · Verkauf '+fmt(r.value*n)+' $'}
async function render(){
 const token=++openToken;stopTimer();
 try{
  const s=await getState();if(token!==openToken)return;
  const {p,jobs,factory,factoryReady,drugs,weapons}=s;
  const slots=5,usedDrug=jobs.filter(j=>!j.drug_type?.startsWith('weapon_')).length,usedWeapon=jobs.filter(j=>j.drug_type?.startsWith('weapon_')).length;
  const drugOptions=Object.entries(recipes).filter(([,r])=>r.kind==='drug').map(([k,r])=>'<option value="'+k+'">'+r.name+' · '+r.cost+' Material/Stück</option>').join('');
  const weaponOptions=Object.entries(recipes).filter(([,r])=>r.kind==='weapon').map(([k,r])=>'<option value="'+k+'" '+(factoryReady?'':'disabled')+'>'+r.name+' · '+r.cost+' Waffenteile/Stück</option>').join('');
  panel(
   '<div class="hero"><span class="hero-icon">⚙️</span><div><b>Produktion</b><p>Drogen und Waffen laufen getrennt in jeweils bis zu 5 Produktionsslots.</p></div></div>'+
   '<div class="production-card"><h3>⚗️ Drogenproduktion</h3><div class="statgrid"><div><b>'+fmt(p.material)+'</b><small>Material</small></div><div><b>'+fmt(drugs)+'</b><small>Drogen</small></div><div><b>'+usedDrug+'/'+slots+'</b><small>Slots</small></div></div><label>Droge</label><select id="marketDrug">'+drugOptions+'</select><label>Menge</label><input id="marketQty" type="number" min="1" value="1"><div id="marketDrugInfo" class="hint"></div><button class="action primary" id="startDrugProduction">▶️ Produktion starten</button></div>'+
   '<div class="production-card"><h3>🏭 Waffenproduktion</h3><div class="statgrid"><div><b>'+fmt(p.weapon_parts)+'</b><small>Waffenteile</small></div><div><b>'+fmt(weapons)+'</b><small>Waffen</small></div><div><b>'+usedWeapon+'/'+slots+'</b><small>Slots</small></div></div><div class="hint">'+(factoryReady?'Waffenfabrik Stufe '+factory+' · Produktionszeit bis zu '+(factory*5)+'% verkürzt.':'Eine fertige Waffenfabrik wird benötigt.')+'</div><label>Waffentyp</label><select id="marketWeapon" '+(factoryReady?'':'disabled')+'>'+weaponOptions+'</select><label>Menge</label><input id="marketWeaponQty" type="number" min="1" value="1" '+(factoryReady?'':'disabled')+'><div id="marketWeaponInfo" class="hint"></div><button class="action primary" id="startWeaponProduction" '+(factoryReady?'':'disabled')+'>▶️ Produktion starten</button></div>'+
   '<h3>Aktive Produktion · '+usedDrug+'/5 Drogen · '+usedWeapon+'/5 Waffen</h3><div class="list">'+(jobs.length?jobs.map(jobCard).join(''):'<div class="hint">Keine laufenden Produktionen.</div>')+'</div>'
  );
  const d=$('marketDrug'),dq=$('marketQty'),di=$('marketDrugInfo'),w=$('marketWeapon'),wq=$('marketWeaponQty'),wi=$('marketWeaponInfo');
  const updateD=()=>{const r=recipes[d?.value];if(r&&dq&&di){const n=Math.max(1,Math.floor(Number(dq.value)||1));dq.value=n;di.textContent=info(r,n)}};
  const updateW=()=>{const r=recipes[w?.value];if(r&&wq&&wi){const n=Math.max(1,Math.floor(Number(wq.value)||1));wq.value=n;wi.textContent=info(r,n)}};
  d?.addEventListener('change',updateD);dq?.addEventListener('input',updateD);w?.addEventListener('change',updateW);wq?.addEventListener('input',updateW);updateD();updateW();
  $('startDrugProduction')?.addEventListener('click',async()=>{try{const n=Math.max(1,Math.floor(Number(dq?.value)||1));await rpc('mtrw_start_production',{p_quantity:n,p_drug_type:d?.value||'weed'});await render()}catch(e){window.mtrwToast?.(e.message||'Drogenproduktion konnte nicht gestartet werden.',true)}});
  $('startWeaponProduction')?.addEventListener('click',async()=>{try{const n=Math.max(1,Math.floor(Number(wq?.value)||1));await rpc('mtrw_start_production',{p_quantity:n,p_drug_type:w?.value||'weapon_melee'});await render()}catch(e){window.mtrwToast?.(e.message||'Waffenproduktion konnte nicht gestartet werden.',true)}});
  document.querySelectorAll('[data-cancel-prod]').forEach(btn=>btn.addEventListener('click',async()=>{try{await rpc('mtrw_cancel_production',{p_job_id:btn.dataset.cancelProd});await render()}catch(e){window.mtrwToast?.(e.message||'Produktion konnte nicht abgebrochen werden.',true)}}));
  const tick=async()=>{
   let due=false;
   document.querySelectorAll('[data-job-id]').forEach(card=>{const left=Number(card.dataset.finish)-Date.now();const out=card.querySelector('[data-job-countdown]');if(out)out.textContent=left>0?'Noch '+remainingText(left)+' · Fertig um '+new Date(Number(card.dataset.finish)).toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit',second:'2-digit'}):'⏳ Wird gutgeschrieben…';if(left<=0)due=true});
   if(due){await collect();await render()}
  };
  tick();timer=setInterval(tick,1000);
 }catch(e){window.mtrwToast?.(e.message||'Produktion konnte nicht geladen werden.',true)}
}
function install(){
 window.mtrwRefreshProduction=render;
 const handler=e=>{const t=e.target.closest?.('[data-market="production"],[data-market="production-v2"]');if(t){e.preventDefault();e.stopImmediatePropagation();render()}};
 document.addEventListener('click',handler,true);
 window.mtrwOpenProduction=render;
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();