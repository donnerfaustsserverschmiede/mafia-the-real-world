/* MAFIVERA – Production V3: Drogen + Waffen */
(()=>{'use strict';
const $=id=>document.getElementById(id),fmt=n=>Number(n||0).toLocaleString('de-DE'),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const recipes={
 weed:{name:'Cannabis',material:10,value:50,seconds:10,kind:'drug'},
 cocaine:{name:'Kokain',material:25,value:100,seconds:15,kind:'drug'},
 meth:{name:'Methamphetamin',material:40,value:190,seconds:20,kind:'drug'},
 heroin:{name:'Heroin',material:60,value:300,seconds:30,kind:'drug'},
 weapon_melee:{name:'Hieb- und Stichwaffen',parts:10,value:300,seconds:30,kind:'weapon'},
 weapon_handgun:{name:'Handfeuerwaffen',parts:25,value:700,seconds:60,kind:'weapon'},
 weapon_smg:{name:'Kleine Langwaffen / Maschinenpistolen',parts:50,value:1400,seconds:120,kind:'weapon'},
 weapon_longarm:{name:'Langwaffen',parts:100,value:2200,seconds:240,kind:'weapon'}
};
async function rpc(n,a={}){const r=await window.db.rpc(n,a);if(r.error)throw r.error;return r.data}
function panel(title,html){const d=$('drawer'),t=$('drawerTitle'),b=$('drawerBody');if(!d||!t||!b)return;t.textContent=title;b.innerHTML=html;d.classList.remove('hidden')}
async function openProduction(){
 let state=null;
 try{state=await rpc('mafivera_collect_production')}catch(e){}
 const prof=await rpc('mafivera_bootstrap'),p=prof?.profile||{};
 const slots=Math.min(5,1+Math.floor(Number(p.level||0)/5));
 const q=await db.from('mtrw_production_jobs').select('id,drug_type,quantity,material_cost,resource_cost_type,started_at,finish_at,status').eq('user_id',p.id).eq('status','running').order('created_at');
 if(q.error)throw q.error;
 const jobs=q.data||[],used=jobs.length;
 const fq=await db.from('world_territories').select('building_level,building_finish_at').eq('owner_id',p.id).eq('building_type','weapon_factory').order('building_level',{ascending:false}).limit(1).maybeSingle();
 const factory=Number(fq.data?.building_level||0),factoryReady=!!fq.data&&(!fq.data.building_finish_at||new Date(fq.data.building_finish_at)<=new Date());
 const wi=await db.from('mtrw_weapon_inventory').select('melee,handguns,smgs,longarms').eq('user_id',p.id).maybeSingle();
 const weapons=Number(wi.data?.melee||0)+Number(wi.data?.handguns||0)+Number(wi.data?.smgs||0)+Number(wi.data?.longarms||0);
 const drugRows=Object.entries(drugs).map(([k,n])=>'<option value="'+k+'">'+n+'</option>').join('');
 const weaponRows=[['weapon_melee','Hieb- und Stichwaffen',10,300],['weapon_handgun','Handfeuerwaffen',25,700],['weapon_smg','Kleine Langwaffen / Maschinenpistolen',50,1400],['weapon_longarm','Langwaffen',100,2200]].map(x=>'<option value="'+x[0]+'" '+(factoryReady?'':'disabled')+'>'+x[1]+' · '+x[2]+' Waffenteile/Stück · '+x[3]+' $ Verkauf</option>').join('');
 const active=jobs.map(j=>{const isW=j.drug_type?.startsWith('weapon_');const names={...drugs,weapon_melee:'Hieb- und Stichwaffen',weapon_handgun:'Handfeuerwaffen',weapon_smg:'Kleine Langwaffen / Maschinenpistolen',weapon_longarm:'Langwaffen'};const finish=new Date(j.finish_at);return '<div class="task-card"><div><b>'+(isW?'🏭':'⚗️')+' '+esc(names[j.drug_type]||j.drug_type)+' · '+fmt(j.quantity)+' Stück</b><small>'+(isW?'Waffenteile':'Material')+': '+fmt(j.material_cost)+' · Fertig: '+(Number.isNaN(finish.getTime())?'Zeit unbekannt':finish.toLocaleString('de-DE'))+'</small></div><button class="mini danger" data-cancel-prod="'+j.id+'">✖ Abbrechen · '+fmt(j.material_cost)+' zurück</button></div>'}).join('');
 panel('Produktion',
 '<div class="hero"><span class="hero-icon">⚗️</span><div><b>Produktion</b><p>'+used+'/'+slots+' Produktionsslots belegt · maximal 5 parallel.</p></div></div>'+
 '<div class="production-card"><h3>⚗️ Drogenproduktion</h3><div class="statgrid"><div><b>'+fmt(p.material)+'</b><small>Material</small></div><div><b>'+fmt(p.product)+'</b><small>Drogen</small></div><div><b>'+slots+'</b><small>Produktionsslots</small></div></div><label>Droge</label><select id="marketDrug">'+drugRows+'</select><label>Menge</label><input id="marketQty" type="number" min="1" value="1"><div id="marketDrugInfo" class="hint"></div><button class="action primary" data-market="start-production">▶️ Produktion starten</button></div>'+
 '<div class="production-card"><h3>🏭 Waffenproduktion</h3><div class="statgrid"><div><b>'+fmt(p.weapon_parts)+'</b><small>Waffenteile</small></div><div><b>'+fmt(weapons)+'</b><small>Waffen</small></div><div><b>'+slots+'</b><small>Produktionsslots</small></div></div><p class="hint">'+(factoryReady?'Waffenfabrik Stufe '+factory+'/20 · Waffenteile-Sammelbonus +'+(factory*5)+'%.':'Eine fertige Waffenfabrik wird benötigt.')+'</p><label>Waffentyp</label><select id="marketWeapon">'+weaponRows+'</select><label>Menge</label><input id="marketWeaponQty" type="number" min="1" value="1"><div id="marketWeaponInfo" class="hint"></div><button class="action primary" data-market="start-weapon-production" '+(factoryReady?'':'disabled')+'>▶️ Produktion starten</button></div>'+
 '<h3>Aktive Produktionen · '+used+'/'+slots+'</h3><div class="list">'+(active||'<div class="hint">Keine laufenden Produktionen.</div>')+'</div>');
 const drug=$('marketDrug'),qty=$('marketQty'),weapon=$('marketWeapon'),wqty=$('marketWeaponQty'),di=$('marketDrugInfo'),wi2=$('marketWeaponInfo');
 const calc=()=>{const r={cocaine:[25,100,15],weed:[10,50,10],meth:[40,190,20],heroin:[60,300,30]}[drug?.value];if(r){const n=Math.max(1,Math.floor(Number(qty.value)||1));qty.value=n;di.innerHTML=fmt(r[0]*n)+' Material benötigt · Produktionszeit '+Math.floor(r[2]*n/60)+' Min. '+((r[2]*n)%60?String((r[2]*n)%60).padStart(2,'0')+' Sek.':'')+' · Verkauf '+fmt(r[1])+' $/Stück'}};
 const wcalc=()=>{const r={weapon_melee:['Hieb- und Stichwaffen',10,300,30],weapon_handgun:['Handfeuerwaffen',25,700,60],weapon_smg:['Kleine Langwaffen / Maschinenpistolen',50,1400,120],weapon_longarm:['Langwaffen',100,2200,240]}[weapon?.value];if(r){const n=Math.max(1,Math.floor(Number(wqty.value)||1));wqty.value=n;winfo=wi2;winfo.innerHTML=fmt(r[1]*n)+' Waffenteile benötigt · Produktionszeit '+Math.floor(r[3]*n/60)+' Min. '+((r[3]*n)%60?String((r[3]*n)%60).padStart(2,'0')+' Sek.':'')+' · Verkauf '+fmt(r[2])+' $/Stück'}};
 drug?.addEventListener('change',calc);qty?.addEventListener('input',calc);weapon?.addEventListener('change',wcalc);wqty?.addEventListener('input',wcalc);calc();wcalc();
}\nfunction install(){const handler=e=>{const t=e.target.closest?.('[data-market="production"],[data-market="production-v2"]');if(t){e.preventDefault();e.stopImmediatePropagation();openProduction()}};document.addEventListener('click',handler,true);window.mtrwOpenProduction=openProduction}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();