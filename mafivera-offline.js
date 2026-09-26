/* MAFIVERA OFFLINE CORE — seamless online/offline continuity */
(()=>{'use strict';
if(window.__mtrwOfflineCore)return;
const KEY='mtrw_offline_v1',DB='mtrw-offline-db',STORE='state';
let state=null,ready=false,syncing=false;
const mutating=new Set([
 'mafivera_claim','mafivera_build','mafivera_upgrade','mafivera_station','mafivera_recall',
 'mafivera_demolish','mafivera_leave_territory','mafivera_sell_products',
 'mtrw_start_production','mtrw_cancel_production','mtrw_sell_to_dealer','mtrw_sell_weapon_to_dealer'
]);
const clone=x=>x==null?x:JSON.parse(JSON.stringify(x));
function idb(){return new Promise((res,rej)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(STORE))r.result.createObjectStore(STORE)};r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
async function read(){try{const d=await idb(),t=d.transaction(STORE,'readonly').objectStore(STORE);return await new Promise((res,rej)=>{const r=t.get('state');r.onsuccess=()=>res(r.result||null);r.onerror=()=>rej(r.error)})}catch(_){return null}}
async function write(v){state=v;try{const d=await idb(),t=d.transaction(STORE,'readwrite').objectStore(STORE);t.put(v,'state')}catch(_){}}
function offline(){return !navigator.onLine||!!window.__mtrwOfflineForced}
function networkError(e){const s=String(e?.message||e||'');return !navigator.onLine||/failed to fetch|network|offline|load failed|fetch/i.test(s)}
function notice(on,msg){document.documentElement.classList.toggle('mtrw-offline',on);let x=document.getElementById('mtrwOfflineStatus');if(!x){x=document.createElement('div');x.id='mtrwOfflineStatus';x.innerHTML='<span id="mtrwOfflineDot">●</span><span id="mtrwOfflineText"></span>';document.body.appendChild(x);const st=document.createElement('style');st.textContent='#mtrwOfflineStatus{position:fixed;left:50%;top:8px;transform:translateX(-50%);z-index:2147483647;padding:7px 12px;border:1px solid #7b6230;border-radius:999px;background:#10151deF;color:#f2c14e;font:900 11px/14px system-ui,sans-serif;box-shadow:0 4px 16px #0009;display:none;pointer-events:none}#mtrwOfflineDot{margin-right:6px}.mtrw-offline #mtrwOfflineStatus{display:block}.mtrw-offline .mtrw-online-only{filter:grayscale(1);opacity:.4;pointer-events:none!important}';document.head.appendChild(st)}x.querySelector('#mtrwOfflineText').textContent=msg||'OFFLINE-MODUS · Fortschritt wird lokal gespeichert';}
function snapshot(profile,world){if(!profile?.id)return;state=state||{profile:null,world:{},queue:[],updated_at:0};state.profile=clone(profile);state.world=clone(world||{});state.updated_at=Date.now();write(state)}
async function ensure(){if(ready)return state;state=await read()||{profile:null,world:{},queue:[],updated_at:0};ready=true;return state}
function localBootstrap(){return state?.profile?{profile:clone(state.profile)}:null}
function queue(name,args){state.queue.push({id:crypto.randomUUID(),name,args:clone(args),created_at:new Date().toISOString()});state.updated_at=Date.now();write(state)}
function saveProfile(p){state.profile={...state.profile,...clone(p)}}
function save(){state.updated_at=Date.now();window.__mtrwProfile=clone(state.profile||{});const p=state.profile||{};[['hudMoney',p.money],['hudMaterial',p.material],['hudHitmen',p.hitmen],['hudLevel',p.level],['hudDrugs',p.product]].forEach(([id,v])=>{const el=document.getElementById(id);if(el)el.textContent=Number(v||0).toLocaleString('de-DE')});const wp=document.getElementById('hudWeaponParts');if(wp)wp.textContent=Number(p.weapon_parts||0).toLocaleString('de-DE')+'/'+Number(p.weapon_parts_cap||10000).toLocaleString('de-DE');write(state);window.dispatchEvent(new CustomEvent('mtrw:offline-updated',{detail:{profile:clone(state.profile)}}))}
function remember(k,v){state=state||{profile:null,world:{},queue:[],updated_at:0};state[k]=clone(v);save()}
function localResult(name,a){
 const p=state.profile||{},w=state.world||{};
 if(name==='mafivera_bootstrap')return localBootstrap();
 if(name==='mtrw_dealer_state')return state.dealer||{active:false};
 if(name==='mtrw_weapon_dealer_state')return state.weaponDealer||{active:false};
 if(name==='mtrw_reject_weapon_dealer'){state.weaponDealer=null;save();queue(name,a);return {success:true};}
 if(name==='mafivera_inventory')return {items:[],total:Number(p.product||0)};
 if(name==='mtrw_collect_drug_production'||name==='mtrw_collect_weapon_production')return {success:true};
 if(name==='mtrw_start_production'){
   const weapon=String(a.p_drug_type||'').startsWith('weapon_'),qty=Math.max(1,Number(a.p_quantity||1));
   const cost=(weapon?{weapon_melee:10,weapon_handgun:25,weapon_smg:50,weapon_longarm:100}:{cocaine:25,weed:10,meth:40,heroin:60})[a.p_drug_type]||0;
   const have=Number(weapon?p.weapon_parts:p.material)||0,total=cost*qty;if(have<total)throw Error(weapon?'Nicht genügend Waffenteile.':'Nicht genügend Material.');
   if(weapon)p.weapon_parts=have-total;else p.material=have-total;
   const job={id:crypto.randomUUID(),drug_type:a.p_drug_type,quantity:qty,material_cost:total,started_at:new Date().toISOString(),finish_at:new Date(Date.now()+(weapon?60000:15000)*qty).toISOString(),status:'running'};
   state.jobs=state.jobs||[];state.jobs.push(job);saveProfile(p);queue(name,a);save();return job;
 }
 if(name==='mtrw_cancel_production'){const j=(state.jobs||[]).find(x=>x.id===a.p_job_id);if(!j)throw Error('Produktion nicht gefunden.');const weapon=String(j.drug_type).startsWith('weapon_');if(weapon)p.weapon_parts=Number(p.weapon_parts||0)+Number(j.material_cost||0);else p.material=Number(p.material||0)+Number(j.material_cost||0);state.jobs=state.jobs.filter(x=>x.id!==j.id);saveProfile(p);queue(name,a);save();return {success:true}}
 if(name==='mafivera_claim'){const z=w[a.p_zone_key];const price=250;if(Number(p.money||0)<price)throw Error('Nicht genügend Geld.');p.money-=price;w[a.p_zone_key]={...(z||{}),zone_key:a.p_zone_key,owner_id:p.id,building_type:null,building_level:0,defense_points:100};saveProfile(p);queue(name,a);save();return {captured:true}}
 if(name==='mafivera_build'){const z=w[a.p_zone_key];const cost=({warehouse:800,money:250,club:750,lab:500,market:900,watch:600,hideout:1000,recruitment:1000,headquarters:10000,weapon_factory:2500})[a.p_building_type]||0;if(Number(p.money||0)<cost)throw Error('Nicht genügend Geld.');p.money-=cost;w[a.p_zone_key]={...(z||{}),building_type:a.p_building_type,building_level:1,building_finish_at:new Date(Date.now()+30000).toISOString()};saveProfile(p);queue(name,a);save();return {success:true}}
 if(name==='mafivera_upgrade'){const z=w[a.p_zone_key]||{};const lvl=Number(z.building_level||1),cost=({warehouse:800,money:250,club:750,lab:500,market:900,watch:600,hideout:1000,recruitment:1000,headquarters:10000,weapon_factory:2500})[z.building_type]||0;const total=cost*(lvl+1);if(Number(p.money||0)<total)throw Error('Nicht genügend Geld.');p.money-=total;w[a.p_zone_key]={...z,building_level:lvl+1,building_finish_at:new Date(Date.now()+30000).toISOString()};saveProfile(p);queue(name,a);save();return {success:true}}
 if(name==='mafivera_station'){const z=w[a.p_zone_key]||{};const n=Math.max(1,Number(a.p_count||1));if(Number(p.hitmen||0)<n)throw Error('Nicht genügend Schläger.');p.hitmen-=n;w[a.p_zone_key]={...z,garrison:Number(z.garrison||0)+n};saveProfile(p);queue(name,a);save();return {success:true}}
 if(name==='mafivera_recall'){const z=w[a.p_zone_key]||{};const n=Math.max(1,Number(a.p_count||1));if(Number(z.garrison||0)<n)throw Error('Nicht genügend stationierte Schläger.');p.hitmen=Number(p.hitmen||0)+n;w[a.p_zone_key]={...z,garrison:Number(z.garrison||0)-n};saveProfile(p);queue(name,a);save();return {recalled:n}}
 if(name==='mafivera_sell_products'){const n=Math.max(1,Number(a.p_count||1));if(Number(p.product||0)<n)throw Error('Nicht genügend Produkte.');p.product-=n;p.money=Number(p.money||0)+n*100;saveProfile(p);queue(name,a);save();return {success:true,money:p.money}}
 if(name==='mtrw_sell_to_dealer'){state.dealer=null;const n=Math.max(1,Number(a.p_quantity||1));p.product=Math.max(0,Number(p.product||0)-n);p.money=Number(p.money||0)+n*1000;saveProfile(p);queue(name,a);return {success:true,sold:n,earned:n*1000,money:p.money}}
 if(name==='mtrw_sell_weapon_to_dealer'){state.weaponDealer=null;const n=Math.max(1,Number(a.p_quantity||1));p.money=Number(p.money||0)+n*500;saveProfile(p);queue(name,a);return {success:true,sold:n,earned:n*500,money:p.money}}
 throw Error('OFFLINE_UNSUPPORTED');
}
function renderProduction(){
 const s=state||{},p=s.profile||{},jobs=(s.jobs||[]).filter(j=>j.status==='running'),w=s.world||{};
 const lab=Object.values(w).filter(x=>x?.owner_id===p.id&&x?.building_type==='lab').sort((a,b)=>Number(b.building_level||0)-Number(a.building_level||0))[0];
 const fac=Object.values(w).filter(x=>x?.owner_id===p.id&&x?.building_type==='weapon_factory').sort((a,b)=>Number(b.building_level||0)-Number(a.building_level||0))[0];
 const drugs={cocaine:['Kokain',25,15000],weed:['Cannabis',10,10000],meth:['Methamphetamin',40,20000],heroin:['Heroin',60,30000]};
 const weapons={weapon_melee:['Hieb- und Stichwaffen',10,30000],weapon_handgun:['Handfeuerwaffen',25,60000],weapon_smg:['Maschinenpistolen',50,120000],weapon_longarm:['Langwaffen',100,240000]};
 const drawer=document.getElementById('drawer'),title=document.getElementById('drawerTitle'),body=document.getElementById('drawerBody');if(!drawer||!title||!body)return;
 title.textContent='Produktion';
 const opts=(obj)=>Object.entries(obj).map(([k,v])=>'<option value="'+k+'">'+v[0]+' · '+v[1]+' Material/Waffenteile</option>').join('');
 const jobsHtml=jobs.map(j=>'<div class="task-card"><div><b>⚙️ '+(drugs[j.drug_type]?.[0]||weapons[j.drug_type]?.[0]||j.drug_type)+' · '+Number(j.quantity||0)+' Stück</b><small>Fertig: '+new Date(j.finish_at).toLocaleTimeString('de-DE')+'</small></div><button class="mini danger" data-offline-cancel="'+j.id+'">✖ Abbrechen</button></div>').join('')||'<div class="hint">Keine laufende Produktion.</div>';
 body.innerHTML='<div class="hint">📵 Offline-Modus · Produktionen werden lokal gespeichert und beim nächsten Onlinegang synchronisiert.</div><div class="production-card"><h3>⚗️ Drogenproduktion</h3><p class="hint">Chemielabor Stufe '+Number(lab?.building_level||0)+'</p><select id="offDrug">'+opts(drugs)+'</select><input id="offDrugQty" type="number" min="1" value="1"><button class="action primary" id="offDrugStart">⚗️ Produktion starten</button></div><div class="production-card"><h3>🏭 Waffenproduktion</h3><p class="hint">Waffenfabrik Stufe '+Number(fac?.building_level||0)+'</p><select id="offWeapon">'+opts(weapons)+'</select><input id="offWeaponQty" type="number" min="1" value="1"><button class="action primary" id="offWeaponStart">🏭 Produktion starten</button></div><h4>Aktive Produktionen</h4><div class="list">'+jobsHtml+'</div>';
 drawer.classList.remove('hidden');
 const start=(sel,qty)=>{const n=Math.max(1,Math.floor(Number(qty.value)||1));handle('mtrw_start_production',{p_drug_type:sel.value,p_quantity:n}).then(()=>{renderProduction();window.dispatchEvent(new CustomEvent('mtrw:offline-updated'))}).catch(e=>alert(e.message||e))};
 document.getElementById('offDrugStart').onclick=()=>start(document.getElementById('offDrug'),document.getElementById('offDrugQty'));
 document.getElementById('offWeaponStart').onclick=()=>start(document.getElementById('offWeapon'),document.getElementById('offWeaponQty'));
 body.querySelectorAll('[data-offline-cancel]').forEach(b=>b.onclick=()=>handle('mtrw_cancel_production',{p_job_id:b.dataset.offlineCancel}).then(renderProduction));
}
async function handle(name,args){await ensure();if(name==='mtrw_family_create'||name.startsWith('mtrw_family_')||name.startsWith('mtrw_social_')||name.includes('heist'))throw Error('Diese Funktion ist offline nicht verfügbar.');return localResult(name,args)}
async function flush(){if(syncing||offline()||!state?.queue?.length||!window.db)return false;syncing=true;notice(false,'');try{for(const q of [...state.queue]){const r=await window.db.rpc(q.name,q.args);if(r.error)throw r.error;state.queue=state.queue.filter(x=>x.id!==q.id);await write(state)}const boot=await window.db.rpc('mafivera_bootstrap');if(!boot.error&&boot.data?.profile)state.profile=clone(boot.data.profile);try{const q=await window.db.from('world_territories').select('*');if(!q.error)state.world=Object.fromEntries((q.data||[]).map(x=>[x.zone_key,x]))}catch(_){}await write(state);window.dispatchEvent(new CustomEvent('mtrw:offline-synced'));return true}catch(e){return false}finally{syncing=false}}
function guard(){if(!offline())return;notice(true,'OFFLINE-MODUS · Fortschritt wird lokal gespeichert');document.addEventListener('click',e=>{if(!offline())return;const t=e.target.closest?.('button,[role="button"],a');if(!t)return;const s=(t.textContent||'').trim();if(/Familie|Sozial|Freunde|Heist|Global Chat|Privatnachricht/i.test(s)){e.preventDefault();e.stopImmediatePropagation();const x=document.getElementById('toast');if(x){x.textContent='Diese Online-Funktion ist offline nicht verfügbar.';x.className='toast show error';setTimeout(()=>x.className='toast',2400)}}},true)}
window.__mtrwOfflineCore={ensure,snapshot,handle,flush,isOffline:offline,networkError,mutating,localBootstrap,notice,remember,renderProduction};
window.addEventListener('online',()=>{window.__mtrwOfflineForced=false;notice(false,'');flush()});
window.addEventListener('offline',()=>{guard()});
(async()=>{await ensure();if(state?.profile)guard();setInterval(()=>{if(offline())guard();else flush()},10000)})();
})();