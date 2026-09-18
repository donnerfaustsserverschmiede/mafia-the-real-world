/* MAFIVERA — territory life bars & combat UI
   Presentation layer: life bars are shown ONLY inside the opened territory menu.
*/
(()=>{'use strict';
if(window.__mtrwTerritoryBars)return;window.__mtrwTerritoryBars=true;

let db=null,drawerObserver=null;
const $=id=>document.getElementById(id);
const fmt=n=>Number(n||0).toLocaleString('de-DE');

const BUILDING_BONUS={
 warehouse:25,money:35,club:40,lab:45,market:50,watch:60,
 hideout:65,recruitment:75,headquarters:100
};
const buildingBonus=t=>BUILDING_BONUS[t]||0;
const maxDefense=t=>25+buildingBonus(t?.building_type)+(Math.max(0,Number(t?.garrison||0))*2);
const currentDefense=t=>Math.max(0,Math.min(maxDefense(t),Number(t?.defense_current??t?.defense_points??25)));
const percent=t=>Math.max(0,Math.min(100,currentDefense(t)/Math.max(1,maxDefense(t))*100));
const defenseClass=p=>p<35?'low':p<70?'mid':'';

const zoneFromLabel=label=>{
 const m=String(label||'').match(/Sektor\s+([NS])(\d+)-([OW])(\d+)/i);
 if(!m)return null;
 const r=(m[1].toUpperCase()==='S'?-1:1)*Number(m[2]);
 const c=(m[3].toUpperCase()==='W'?-1:1)*Number(m[4]);
 return 'z_'+r+'_'+c;
};

function injectStyle(){
 if($('mtrwLifeCSS'))return;
 const s=document.createElement('style');
 s.id='mtrwLifeCSS';
 s.textContent=[
  '.mtrw-territory-life{margin:12px 0;padding:14px;border:1px solid #34404d;border-radius:14px;background:linear-gradient(180deg,#111a24,#0d151e);box-shadow:inset 0 1px rgba(255,255,255,.03)}',
  '.mtrw-life-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:9px}',
  '.mtrw-life-title{font-size:15px;font-weight:800;color:#fff}',
  '.mtrw-life-value{font-size:14px;font-weight:800;color:#fff;white-space:nowrap}',
  '.mtrw-life-bigtrack{height:13px;border:2px solid #101820;border-radius:12px;background:#252b31;overflow:hidden;box-shadow:inset 0 1px 3px rgba(0,0,0,.6)}',
  '.mtrw-life-bigfill{height:100%;border-radius:10px;background:#45d483;transition:width .35s ease}',
  '.mtrw-life-bigfill.mid{background:#f0b53c}',
  '.mtrw-life-bigfill.low{background:#e45a55}',
  '.mtrw-life-percent{text-align:right;margin-top:5px;font-size:11px;color:#aeb9c8}',
  '.mtrw-life-desc{margin-top:7px;color:#91a0b3;font-size:10px;line-height:1.45}',
  '.mtrw-combat-box{margin:10px 0;padding:12px;border:1px solid #34404d;border-radius:14px;background:#101923}',
  '.mtrw-combat-box h3{margin:0 0 10px;font-size:14px;color:#fff}',
  '.mtrw-combat-grid{display:grid;grid-template-columns:1fr 1fr;gap:7px}',
  '.mtrw-combat-stat{padding:9px;border-radius:10px;background:#171f2a;border:1px solid #293542}',
  '.mtrw-combat-stat b{display:block;font-size:15px;color:#fff}',
  '.mtrw-combat-stat small{display:block;color:#8e9aaa;font-size:9px;margin-top:2px}',
  '.mtrw-combat-row{display:flex;justify-content:space-between;gap:10px;padding:7px 0;border-bottom:1px solid #27313c;color:#b9c4d1;font-size:11px}',
  '.mtrw-combat-row:last-child{border-bottom:0}',
  '.mtrw-combat-row b{color:#fff}',
 ].join('');
 document.head.appendChild(s);
}

async function readSelectedTerritory(){
 const title=$('drawerTitle'),body=$('drawerBody');
 if(!title||!body||title.textContent.trim()!=='Gebiet')return null;
 const heading=body.querySelector('h3');
 const zone=zoneFromLabel(heading?.textContent);
 if(!zone)return null;

 let t=null;
 try{
  const q=await db.from('world_territories')
   .select('zone_key,owner_id,defense_points,defense_current,garrison,building_type,building_level')
   .eq('zone_key',zone).maybeSingle();
  if(!q.error)t=q.data;
 }catch(e){}
 return {zone,t:t||{
  zone_key:zone,owner_id:null,defense_points:25,defense_current:25,
  garrison:0,building_type:null,building_level:1
 }};
}

function renderDrawerLife(){
 readSelectedTerritory().then(result=>{
  if(!result)return;
  const body=$('drawerBody');
  if(!body)return;

  const old=body.querySelector('#mtrwTerritoryLife');
  if(old)old.remove();
  const oldCombat=body.querySelector('#mtrwCombatBox');
  if(oldCombat)oldCombat.remove();

  const t=result.t;
  const max=maxDefense(t),cur=currentDefense(t),p=percent(t),cls=defenseClass(p);

  const box=document.createElement('section');
  box.id='mtrwTerritoryLife';
  box.className='mtrw-territory-life';
  box.innerHTML=
   '<div class="mtrw-life-head"><span class="mtrw-life-title">❤ Gebiets-Lebensleiste</span><span class="mtrw-life-value">'+fmt(cur)+' / '+fmt(max)+' HP</span></div>'+
   '<div class="mtrw-life-bigtrack"><div class="mtrw-life-bigfill '+cls+'" style="width:'+p.toFixed(1)+'%"></div></div>'+
   '<div class="mtrw-life-percent">'+p.toFixed(0)+' %</div>'+
   '<div class="mtrw-life-desc">Die Lebensleiste zeigt die aktuelle Verteidigung dieses Gebiets. Schläger und Gebäude erhöhen die maximale Verteidigung.</div>';

  const stats=body.querySelector('.statgrid');
  if(stats)stats.insertAdjacentElement('afterend',box);
  else body.prepend(box);

  const building=buildingBonus(t.building_type);
  const combat=document.createElement('section');
  combat.id='mtrwCombatBox';
  combat.className='mtrw-combat-box';
  combat.innerHTML=
   '<h3>⚔️ Kampfwerte</h3>'+
   '<div class="mtrw-combat-grid">'+
   '<div class="mtrw-combat-stat"><b>25</b><small>Grundverteidigung</small></div>'+
   '<div class="mtrw-combat-stat"><b>2</b><small>Angriffspunkte je Schläger</small></div>'+
   '</div>'+
   '<div class="mtrw-combat-row"><span>👥 Verteidigung durch Schläger</span><b>+'+fmt(Math.max(0,Number(t.garrison||0))*2)+'</b></div>'+
   '<div class="mtrw-combat-row"><span>🏛️ Verteidigung durch Gebäude</span><b>+'+fmt(building)+'</b></div>'+
   '<div class="mtrw-combat-row"><span>🛡️ Gesamtverteidigung</span><b>'+fmt(max)+'</b></div>'+
   '<div class="mtrw-combat-row"><span>⚔️ Angriffspunkte je Schläger</span><b>2</b></div>'+
   '<div class="mtrw-combat-row"><span>🏆 XP bei erfolgreicher Eroberung</span><b>+25 XP</b></div>';

  box.insertAdjacentElement('afterend',combat);
 });
}

function observeDrawer(){
 const body=$('drawerBody');
 if(!body||drawerObserver)return;
 drawerObserver=new MutationObserver(()=>setTimeout(renderDrawerLife,40));
 drawerObserver.observe(body,{childList:true,subtree:true});
 setTimeout(renderDrawerLife,100);
}

async function boot(){
 injectStyle();
 await new Promise(resolve=>{
  let n=0;
  const tick=()=>{
   db=window.db;
   if(db)return resolve();
   if(++n>240)return;
   setTimeout(tick,250);
  };
  tick();
 });
 observeDrawer();
}
boot().catch(e=>console.warn('[MAFIVERA territory life UI boot]',e));
})();