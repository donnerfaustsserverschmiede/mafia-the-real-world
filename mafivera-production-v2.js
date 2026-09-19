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
 try{await rpc('mafivera_collect_production')}catch(e){}
 const b=await rpc('mafivera_bootstrap'),p=b?.profile||{};
 const slots=Math.min(5,1+Math.floor(Number(p.level||0)/5));
 const q=await window.db.from('mtrw_production_jobs').select('id,drug_type,quantity,material_cost,started_at,finish_at,status').eq('user_id',p.id).eq('status','running').order('created_at');
 if(q.error)throw q.error;
 const jobs=q.data||[],used=jobs.length;
 const fq=await window.db.from('world_territories').select('building_level,building_finish_at').eq('owner_id',p.id).eq('building_type','weapon_factory').order('building_level',{ascending:false}).limit(1).maybeSingle();
 const factory=Number(fq.data?.building_level||0),factoryReady=!!fq.data&&(!fq.data.building_finish_at||new Date(fq.data.building_finish_at)<=new Date());
 const drugRows=Object.entries(recipes).filter(x=>x[1].kind==='drug').map(x=>'<option value="'+x[0]+'">'+x[1].name+' · '+fmt(x[1].material)+' Material/Stück · '+fmt(x[1].value)+' $ Verkauf</option>').join('');
 const weaponRows=Object.entries(recipes).filter(x=>x[1].kind==='weapon').map(x=>'<option value="'+x[0]+'" '+(factoryReady?'':'disabled')+'>'+x[1].name+' · '+fmt(x[1].parts)+' Waffenteile/Stück · '+fmt(x[1].value)+' $ Verkauf</option>').join('');
 const productRows=drugRows+weaponRows;
 const active=jobs.map(j=>{const r=recipes[j.drug_type]||{name:j.drug_type,kind:j.drug_type?.startsWith('weapon_')?'weapon':'drug'};const finish=new Date(j.finish_at);return '<div class="task-card"><div><b>'+(r.kind==='weapon'?'🏭':'⚗️')+' '+esc(r.name)+' · '+fmt(j.quantity)+' Stück</b><small>'+(r.kind==='weapon'?'Waffenteile':'Material')+': '+fmt(j.material_cost)+' · Fertig: '+(Number.isNaN(finish.getTime())?'Zeit unbekannt':finish.toLocaleString('de-DE'))+'</small></div><button class="mini danger" data-cancel-prod="'+j.id+'">✖ Abbrechen · '+fmt(j.material_cost)+' zurück</button></div>'}).join('');
 panel('Produktion',
 '<div class="hero"><span class="hero-icon">⚗️</span><div><b>Produktion</b><p>'+used+'/'+slots+' Produktionsslots belegt · maximal 5 parallel.</p></div></div>'+
 '<div class="statgrid"><div><b>'+fmt(p.material)+'</b><small>Material</small></div><div><b>'+fmt(p.weapon_parts)+'</b><small>Waffenteile</small></div><div><b>'+slots+'</b><small>Produktionsslots</small></div></div>'+
 '<div class="production-card"><h3>⚗️ Produktion</h3><label>Produkt</label><select id="mtrwProdDrug">'+productRows+'</select><p class="hint">'+(factoryReady?'🏭 Waffenfabrik Stufe '+factory+'/20 · Waffenteile-Feldbonus +'+(factory*5)+'%.':'🔒 Waffenproduktion: fertige Waffenfabrik erforderlich.')+'</p><label>Menge</label><input id="mtrwProdQty" type="number" min="1" value="1"><div id="mtrwRecipeInfo" class="hint"></div><button id="mtrwProdStart" class="action primary" type="button" '+(used>=slots?'disabled':'')+'>▶️ Produktion starten</button></div>'+ '<h3>Aktive Produktionen · '+used+'/'+slots+'</h3><div class="list">'+(active||'<div class="hint">Keine laufenden Produktionen.</div>')+'</div>');
 const drug=$('mtrwProdDrug'),qty=$('mtrwProdQty'),info=$('mtrwRecipeInfo'),start=$('mtrwProdStart');
 function calcProduct(){const r=recipes[drug?.value];if(!r)return;const n=Math.max(1,Math.floor(Number(qty.value)||1));qty.value=n;const s=r.seconds*n;const cost=r.kind==='weapon'?fmt(r.parts*n)+' Waffenteile benötigt':fmt(r.material*n)+' Material benötigt';info.innerHTML=cost+' · Produktionszeit '+Math.floor(s/60)+' Min. '+(s%60?String(s%60).padStart(2,'0')+' Sek.':'')+' · Verkauf '+fmt(r.value)+' $/Stück'}
 drug?.addEventListener('change',calcProduct);qty?.addEventListener('input',calcProduct);calcProduct();
 start?.addEventListener('click',async()=>{try{const n=Math.max(1,Math.floor(Number(qty.value)||1));const r=recipes[drug.value];if(!r)throw Error('Kein Produkt ausgewählt.');if(r.kind==='weapon'&&!factoryReady)throw Error('Eine fertige Waffenfabrik wird benötigt.');await rpc('mtrw_start_production',{p_quantity:n,p_drug_type:drug.value});await openProduction();window.mtrwToast?.((r.kind==='weapon'?'Waffenproduktion':'Drogenproduktion')+' gestartet.')}catch(e){window.mtrwToast?.(e.message||'Produktion konnte nicht gestartet werden',true)}});
 document.querySelectorAll('[data-cancel-prod]').forEach(x=>x.onclick=async()=>{try{const r=await rpc('mtrw_cancel_production',{p_job_id:x.dataset.cancelProd});await openProduction();window.mtrwToast?.('Produktion abgebrochen · '+fmt(r.refund)+' zurück')}catch(e){window.mtrwToast?.(e.message||'Abbruch fehlgeschlagen',true)}});
}
function install(){const handler=e=>{const t=e.target.closest?.('[data-market="production"],[data-market="production-v2"]');if(t){e.preventDefault();e.stopImmediatePropagation();openProduction()}};document.addEventListener('click',handler,true);window.mtrwOpenProduction=openProduction}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();