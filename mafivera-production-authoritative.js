/* MAFIVERA — authoritative production UI
   Loaded last so legacy production handlers cannot replace the visible menu. */
(()=>{'use strict';
if(window.__mtrwAuthoritativeProduction)return;window.__mtrwAuthoritativeProduction=true;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Number(n||0).toLocaleString('de-DE');
const $=id=>document.getElementById(id);
const recipes={weed:['Cannabis',10,50,10],cocaine:['Kokain',25,100,15],meth:['Methamphetamin',40,190,20],heroin:['Heroin',60,300,30]};
const weapons={weapon_melee:['Hieb- und Stichwaffen',10,300,30],weapon_handgun:['Handfeuerwaffen',25,700,60],weapon_smg:['Kleine Langwaffen / Maschinenpistolen',50,1400,120],weapon_longarm:['Langwaffen',100,2200,240]};
async function rpc(n,a={}){const r=await window.db.rpc(n,a);if(r.error)throw r.error;return r.data}
function panel(html){const d=$('drawer'),t=$('drawerTitle'),b=$('drawerBody');if(!d||!t||!b)return;t.textContent='Produktion';b.innerHTML=html;d.classList.remove('hidden')}
async function open(){
 try{
  try{await rpc('mafivera_collect_production')}catch(e){}
  const boot=await rpc('mafivera_bootstrap'),p=boot?.profile||{},slots=Math.min(5,1+Math.floor(Number(p.level||0)/5));
  const jobsQ=await db.from('mtrw_production_jobs').select('id,drug_type,quantity,material_cost,resource_cost_type,finish_at,status').eq('user_id',p.id).eq('status','running').order('created_at');
  if(jobsQ.error)throw jobsQ.error;const jobs=jobsQ.data||[],used=jobs.length;
  const di=await db.from('mtrw_drug_inventory').select('quantity').eq('user_id',p.id);if(di.error)throw di.error;
  const drugs=di.data?.reduce((s,x)=>s+Number(x.quantity||0),0)||0;
  const wi=await db.from('mtrw_weapon_inventory').select('melee,handguns,smgs,longarms').eq('user_id',p.id).maybeSingle();
  const weaponsTotal=wi.data?Number(wi.data.melee||0)+Number(wi.data.handguns||0)+Number(wi.data.smgs||0)+Number(wi.data.longarms||0):0;
  const fq=await db.from('world_territories').select('building_level,building_finish_at').eq('owner_id',p.id).eq('building_type','weapon_factory').order('building_level',{ascending:false}).limit(1).maybeSingle();
  const fl=Number(fq.data?.building_level||0),ready=!!fq.data&&(!fq.data.building_finish_at||new Date(fq.data.building_finish_at)<=new Date());
  const dropts=Object.entries(recipes).map(([k,r])=>'<option value="'+k+'">'+r[0]+' · '+r[1]+' Material/Stück · '+r[2]+' $</option>').join('');
  const wepts=Object.entries(weapons).map(([k,r])=>'<option value="'+k+'" '+(ready?'':'disabled')+'>'+r[0]+' · '+r[1]+' Waffenteile/Stück · '+r[2]+' $</option>').join('');
  const active=jobs.map(j=>{const w=j.drug_type?.startsWith('weapon_'),r=(w?weapons:recipes)[j.drug_type]||[j.drug_type,0,0,0],f=new Date(j.finish_at);return '<div class="task-card"><div><b>'+(w?'🏭':'⚗️')+' '+esc(r[0])+' · '+fmt(j.quantity)+' Stück</b><small>'+(w?'Waffenteile':'Material')+': '+fmt(j.material_cost)+' · Fertig: '+(Number.isNaN(f.getTime())?'Zeit unbekannt':f.toLocaleString('de-DE'))+'</small></div><button class="mini danger" data-auth-cancel="'+j.id+'">✖ Abbrechen</button></div>'}).join('');
  panel('<div class="hero"><span class="hero-icon">⚗️</span><div><b>Produktion</b><p>Produktionsslots: <b>'+used+'/'+slots+'</b> · maximal 5 parallel.</p></div></div>'+
   '<div class="production-card"><h3>⚗️ Drogenproduktion</h3><div class="statgrid"><div><b>'+fmt(p.material)+'</b><small>Material</small></div><div><b>'+fmt(drugs)+'</b><small>Drogen</small></div><div><b>'+slots+'</b><small>Produktionsslots</small></div></div><label>Droge</label><select id="authDrug">'+dropts+'</select><label>Menge</label><input id="authDrugQty" type="number" min="1" value="1"><div id="authDrugInfo" class="hint"></div><button class="action primary" data-auth-start="drug">▶️ Produktion starten</button></div>'+
   '<div class="production-card"><h3>🏭 Waffenproduktion</h3><div class="statgrid"><div><b>'+fmt(p.weapon_parts)+'</b><small>Waffenteile</small></div><div><b>'+fmt(weaponsTotal)+'</b><small>Waffen</small></div><div><b>'+slots+'</b><small>Produktionsslots</small></div></div><div class="hint">'+(ready?'Waffenfabrik Stufe '+fl+' · Sammelbonus +'+(fl*5)+'%':'Eine fertige Waffenfabrik wird benötigt.')+'</div><label>Waffentyp</label><select id="authWeapon" '+(ready?'':'disabled')+'>'+wepts+'</select><label>Menge</label><input id="authWeaponQty" type="number" min="1" value="1" '+(ready?'':'disabled')+'><div id="authWeaponInfo" class="hint"></div><button class="action primary" data-auth-start="weapon" '+(ready&&used<slots?'':'disabled')+'>▶️ Produktion starten</button></div>'+
   '<h3>Aktive Produktionen · '+used+'/'+slots+'</h3><div class="list">'+(active||'<div class="hint">Keine laufenden Produktionen.</div>')+'</div>');
  const calc=(id,qid,info,src,kind)=>{const r=src[$(id)?.value];if(!r)return;const n=Math.max(1,Math.floor(Number($(qid).value)||1));$(qid).value=n;$(info).innerHTML=fmt(r[1]*n)+' '+(kind?'Waffenteile':'Material')+' benötigt · Produktionszeit '+Math.floor(r[3]*n/60)+' Min. '+((r[3]*n)%60?String((r[3]*n)%60).padStart(2,'0')+' Sek.':'')+' · Verkauf '+fmt(r[2]*n)+' $';};
  const cd=()=>calc('authDrug','authDrugQty','authDrugInfo',recipes,false),cw=()=>calc('authWeapon','authWeaponQty','authWeaponInfo',weapons,true);
  $('authDrug').onchange=cd;$('authDrugQty').oninput=cd;if(ready){$('authWeapon').onchange=cw;$('authWeaponQty').oninput=cw}cd();if(ready)cw();
 }catch(e){window.mtrwToast?.(e.message||'Produktion konnte nicht geladen werden',true)}
}
document.addEventListener('click',async e=>{
 const prod=e.target.closest?.('[data-market="production"],[data-market="production-v2"]');
 if(prod){e.preventDefault();e.stopImmediatePropagation();await open();return}
 const s=e.target.closest?.('[data-auth-start]');
 if(s){e.preventDefault();e.stopImmediatePropagation();if(s.disabled)return;try{const weapon=s.dataset.authStart==='weapon',n=Math.max(1,Math.floor(Number($(weapon?'authWeaponQty':'authDrugQty')?.value)||1)),d=$(weapon?'authWeapon':'authDrug')?.value;await rpc('mtrw_start_production',{p_quantity:n,p_drug_type:d});await open()}catch(err){window.mtrwToast?.(err.message||'Produktion konnte nicht gestartet werden',true)}return}
 const c=e.target.closest?.('[data-auth-cancel]');
 if(c){e.preventDefault();e.stopImmediatePropagation();try{await rpc('mtrw_cancel_production',{p_job_id:c.dataset.authCancel});await open()}catch(err){window.mtrwToast?.(err.message||'Abbruch fehlgeschlagen',true)}}
},true);
window.mtrwOpenProduction=open;
})();