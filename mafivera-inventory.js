/* MAFIVERA — GTA-style drug inventory */
(()=>{'use strict';
const DRUGS=[['cocaine','Kokain','❄️'],['weed','Cannabis','🌿'],['meth','Methamphetamin','💎'],['heroin','Heroin','💉']];
let db=null,open=false,timer=null;
const $=id=>document.getElementById(id);
const fmt=n=>Number(n||0).toLocaleString('de-DE');
async function loadInventory(){
  db=window.db||db;if(!db)return null;
  const r=await db.from('mtrw_drug_inventory').select('drug_type,quantity');
  if(r.error)throw r.error;
  const inv=Object.fromEntries(DRUGS.map(([k])=>[k,0]));
  (r.data||[]).forEach(x=>{if(x.drug_type in inv)inv[x.drug_type]=Number(x.quantity||0)});
  const total=Object.values(inv).reduce((a,b)=>a+b,0);
  const hud=$('hudDrugs');if(hud)hud.textContent=fmt(total);
  return {inv,total};
}
function showInventory(data){
  const d=$('drawer'),t=$('drawerTitle'),b=$('drawerBody');if(!d||!t||!b)return;
  t.textContent='Inventar';
  b.innerHTML=`<div class="hero"><span class="hero-icon">🎒</span><div><b>Drogen-Inventar</b><p>Alle Drogen werden getrennt gelagert. Die Zahl oben bei „Drogen“ zeigt die Gesamtmenge.</p></div></div><div class="inventory-total"><b>${fmt(data.total)}</b><small>Drogen gesamt</small></div><div class="inventory-grid">${DRUGS.map(([k,name,icon])=>`<div class="inventory-slot"><span class="inventory-icon">${icon}</span><div><b>${name}</b><small>${fmt(data.inv[k])} Stück</small></div><strong>${fmt(data.inv[k])}</strong></div>`).join('')}</div>`;
  d.classList.remove('hidden');open=true;
}
async function openInventory(){try{const data=await loadInventory();if(data)showInventory(data)}catch(e){const x=$('toast');if(x){x.textContent=e.message||'Inventar konnte nicht geladen werden';x.className='toast show error';setTimeout(()=>x.className='toast',2800)}}}
function bind(){
  const hud=$('hudDrugs');if(!hud||hud.dataset.inventoryBound)return false;
  hud.dataset.inventoryBound='1';hud.style.cursor='pointer';hud.title='Drogen-Inventar öffnen';
  const target=hud.closest('button,[role="button"],.hud-item,.hud-stat,.stat')||hud;
  target.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();openInventory()});
  return true;
}
function boot(){
  let tries=0;const t=setInterval(async()=>{if(window.db){bind();try{await loadInventory()}catch(e){}}if(bind()||++tries>120){}},2000);
  timer=t;
  window.addEventListener('mtrw:inventory-refresh',()=>loadInventory().catch(()=>{}));
  const close=$('drawerClose');close?.addEventListener('click',()=>{open=false});
  setTimeout(()=>{bind();loadInventory().catch(()=>{})},1000);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();