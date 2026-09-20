/* MAFIVERA — separate weapon production menu */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const fmt=n=>Number(n||0).toLocaleString('de-DE');
const esc=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
const weapons={weapon_melee:['Hieb- und Stichwaffen',10,300,30],weapon_handgun:['Handfeuerwaffen',25,700,60],weapon_smg:['Kleine Langwaffen / Maschinenpistolen',50,1400,120],weapon_longarm:['Langwaffen',100,2200,240]};
async function rpc(name,args={}){const r=await window.db.rpc(name,args);if(r.error)throw r.error;return r.data}
function show(title,html){const d=$('drawer'),t=$('drawerTitle'),b=$('drawerBody');if(!d||!t||!b)return;t.textContent=title;b.innerHTML=html;d.classList.remove('hidden')}
function notify(msg,error=false){if(window.mtrwToast)return window.mtrwToast(msg,error);const x=$('toast');if(x){x.textContent=msg;x.className='toast show'+(error?' error':'');setTimeout(()=>x.className='toast',2800)}}
async function openWeapons(){
 try{
  await rpc('mtrw_collect_weapon_production');
  const prof=await rpc('mafivera_bootstrap'),p=prof?.profile||{};
  const totalSlots=Math.min(10,2*(1+Math.floor(Number(p.level||0)/5))),slots=Math.max(1,Math.floor(totalSlots/2));
  const q=await window.db.from('mtrw_production_jobs').select('id,drug_type,quantity,material_cost,finish_at,status').eq('user_id',p.id).eq('status','running').in('drug_type',['weapon_melee','weapon_handgun','weapon_smg','weapon_longarm']).order('created_at');
  if(q.error)throw q.error;
  const jobs=q.data||[],used=jobs.length;
  const fq=await window.db.from('world_territories').select('building_level,building_finish_at').eq('owner_id',p.id).eq('building_type','weapon_factory').order('building_level',{ascending:false}).limit(1).maybeSingle();
  if(fq.error)throw fq.error;
  const factory=Number(fq.data?.building_level||0),ready=!!fq.data&&(!fq.data.building_finish_at||new Date(fq.data.building_finish_at)<=new Date());
  const wi=await window.db.from('mtrw_weapon_inventory').select('melee,handguns,smgs,longarms').eq('user_id',p.id).maybeSingle();
  if(wi.error)throw wi.error;
  const inv=wi.data||{},totalWeapons=Number(inv.melee||0)+Number(inv.handguns||0)+Number(inv.smgs||0)+Number(inv.longarms||0);
  const options=Object.entries(weapons).map(([k,v])=>'<option value="'+k+'" '+(ready?'':'disabled')+'>'+v[0]+' · '+v[1]+' Waffenteile/Stück · '+v[2]+' $ Verkauf</option>').join('');
  const active=jobs.map(j=>{const f=new Date(j.finish_at),name=weapons[j.drug_type]?.[0]||j.drug_type;return '<div class="task-card"><div><b>🏭 '+esc(name)+' · '+fmt(j.quantity)+' Stück</b><small>Waffenteile: '+fmt(j.material_cost)+' · Fertig: '+(Number.isNaN(f.getTime())?'Zeit unbekannt':f.toLocaleString('de-DE'))+'</small></div><button class="mini danger" data-weapon-cancel="'+j.id+'">✖ Abbrechen</button></div>'}).join('');
  show('Waffenproduktion','<div class="hero"><span class="hero-icon">🏭</span><div><b>Waffenproduktion</b><p>Waffen werden getrennt von der Drogenproduktion ausschließlich mit Waffenteilen hergestellt.</p></div></div>'+
   '<div class="statgrid"><div><b>'+fmt(p.weapon_parts)+'</b><small>Waffenteile</small></div><div><b>'+fmt(totalWeapons)+'</b><small>Waffen</small></div><div><b>'+slots+'</b><small>Produktionsslots</small></div></div>'+
   '<div class="production-card"><h3>Neue Waffenproduktion</h3><div class="hint">'+(ready?'Waffenfabrik Stufe '+factory+' · Sammelbonus +'+(factory*5)+'%.':'Eine fertige Waffenfabrik wird benötigt.')+'</div><label>Waffentyp</label><select id="marketWeapon">'+options+'</select><label>Menge</label><input id="marketWeaponQty" type="number" min="1" value="1" '+(ready?'':'disabled')+'><div id="marketWeaponInfo" class="hint"></div><button id="startWeaponProduction" class="action primary" '+(ready?'':'disabled')+'>▶️ Produktion starten</button></div>'+
   '<h3>Aktive Waffenproduktionen · '+used+'/'+slots+'</h3><div class="list">'+(active||'<div class="hint">Keine laufenden Waffenproduktionen.</div>')+'</div>');
  const sel=$('marketWeapon'),qty=$('marketWeaponQty'),info=$('marketWeaponInfo');
  const calc=()=>{const r=weapons[sel?.value];if(!r||!qty||!info)return;const n=Math.max(1,Math.floor(Number(qty.value)||1));qty.value=n;info.innerHTML=fmt(r[1]*n)+' Waffenteile benötigt · Produktionszeit '+Math.floor(r[3]*n/60)+' Min. '+((r[3]*n)%60?String((r[3]*n)%60).padStart(2,'0')+' Sek.':'')+' · Verkauf '+fmt(r[2]*n)+' $'};
  sel?.addEventListener('change',calc);qty?.addEventListener('input',calc);calc();
  $('startWeaponProduction')?.addEventListener('click',async()=>{try{const n=Math.max(1,Math.floor(Number(qty?.value||0))),type=sel?.value||'weapon_melee';await rpc('mtrw_start_production',{p_quantity:n,p_drug_type:type});await openWeapons();notify('Waffenproduktion gestartet.')}catch(e){notify(e.message||'Waffenproduktion konnte nicht gestartet werden.',true)}});
  document.querySelectorAll('[data-weapon-cancel]').forEach(btn=>btn.addEventListener('click',async()=>{try{const r=await rpc('mtrw_cancel_production',{p_job_id:btn.dataset.weaponCancel});await openWeapons();notify('Produktion abgebrochen · '+fmt(r.refund||0)+' Waffenteile zurück')}catch(e){notify(e.message||'Abbruch fehlgeschlagen',true)}}));
 }catch(e){notify(e.message||'Waffenproduktion konnte nicht geladen werden.',true)}
}
function installMenu(){
 const body=$('drawerBody'),menu=body?.querySelector('.market-menu');if(!menu)return;
 const drug=menu.querySelector('[data-market="production"]');if(!drug)return;
 drug.textContent='⚗️ Drogenproduktion';
 if(menu.querySelector('[data-mtrw-weapon-menu]'))return;
 const b=document.createElement('button');b.className='action';b.type='button';b.dataset.mtrwWeaponMenu='1';b.textContent='🏭 Waffenproduktion';b.onclick=e=>{e.preventDefault();openWeapons()};
 menu.insertBefore(b,drug.nextSibling);
}
window.mtrwOpenWeapons=openWeapons;
const obs=new MutationObserver(()=>installMenu());
function boot(){const b=$('drawerBody');if(!b)return;obs.observe(b,{childList:true,subtree:true});installMenu()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();