/* MAFIVERA — territory life bars & combat UI
   Isolated presentation layer. It never replaces the stable map runtime.
*/
(()=>{'use strict';
if(window.__mtrwTerritoryBars)return;window.__mtrwTerritoryBars=true;

let db=null,map=null,markers=[],refreshTimer=null,drawerObserver=null;
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
  '.mtrw-life-marker{background:transparent!important;border:0!important;width:88px!important;height:34px!important;pointer-events:none}',
  '.mtrw-life-wrap{width:88px;margin-top:2px;filter:drop-shadow(0 2px 3px rgba(0,0,0,.8))}',
  '.mtrw-life-label{font:800 9px/1.1 system-ui;color:#fff;text-align:center;margin-bottom:3px;text-shadow:0 1px 3px #000}',
  '.mtrw-life-track{height:7px;border:1px solid #0b1118;border-radius:8px;background:#202832;overflow:hidden;box-shadow:0 1px 3px #000}',
  '.mtrw-life-fill{height:100%;border-radius:8px;background:#45d483;transition:width .4s ease}',
  '.mtrw-life-fill.mid{background:#f0b53c}',
  '.mtrw-life-fill.low{background:#e45a55}',
  '.mtrw-territory-life{margin:10px 0;padding:12px;border:1px solid #34404d;border-radius:14px;background:linear-gradient(180deg,#111a24,#0d151e);box-shadow:inset 0 1px rgba(255,255,255,.03)}',
  '.mtrw-life-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px}',
  '.mtrw-life-title{font-size:15px;font-weight:800;color:#fff}',
  '.mtrw-life-value{font-size:14px;font-weight:800;color:#fff;white-space:nowrap}',
  '.mtrw-life-bigtrack{height:12px;border:2px solid #101820;border-radius:12px;background:#252b31;overflow:hidden;box-shadow:inset 0 1px 3px rgba(0,0,0,.6)}',
  '.mtrw-life-bigfill{height:100%;border-radius:10px;background:#45d483;transition:width .35s ease}',
  '.mtrw-life-bigfill.mid{background:#f0b53c}',
  '.mtrw-life-bigfill.low{background:#e45a55}',
  '.mtrw-life-percent{text-align:right;margin-top:4px;font-size:11px;color:#aeb9c8}',
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
  '.mtrw-xp-note{margin-top:8px;color:#8e9aaa;font-size:9px;line-height:1.35}'
 ].join('');
 document.head.appendChild(s);
}

function clearMarkers(){markers.forEach(m=>m.remove());markers=[];}

function visibleCells(){
 if(!map)return [];
 const b=map.getBounds();
 const r1=Math.floor(b.getSouth()/0.0018)-1;
 const r2=Math.floor(b.getNorth()/0.0018)+1;
 const c1=Math.floor(b.getWest()/0.0025)-1;
 const c2=Math.floor(b.getEast()/0.0025)+1;
 const out=[];
 for(let r=r1;r<=r2;r++)for(let c=c1;c<=c2;c++)out.push({
  zone_key:'z_'+r+'_'+c,
  lat:(r+.5)*0.0018,
  lng:(c+.5)*0.0025
 });
 return out;
}

async function loadBars(){
 if(!db||!map||!window.L)return;
 try{
  const q=await db.from('world_territories')
   .select('zone_key,owner_id,center_lat,center_lng,defense_points,defense_current,garrison,building_type,building_level');
  if(q.error)throw q.error;
  const world={};
  (q.data||[]).forEach(t=>world[t.zone_key]=t);

  clearMarkers();
  visibleCells().forEach(cell=>{
   const t=world[cell.zone_key]||{zone_key:cell.zone_key,owner_id:null,defense_points:25,defense_current:25,garrison:0,building_type:null};
   const max=maxDefense(t);
   const cur=currentDefense(t);
   const p=percent(t);
   const cls=defenseClass(p);
   const lat=Number(t.center_lat??cell.lat);
   const lng=Number(t.center_lng??cell.lng);
   const html='<div class="mtrw-life-wrap"><div class="mtrw-life-label">❤ '+fmt(cur)+' / '+fmt(max)+'</div><div class="mtrw-life-track"><div class="mtrw-life-fill '+cls+'" style="width:'+p.toFixed(1)+'%"></div></div></div>';
   const icon=L.divIcon({className:'mtrw-life-marker',html,iconSize:[88,34],iconAnchor:[44,0]});
   markers.push(L.marker([lat,lng],{icon,interactive:false,zIndexOffset:480}).addTo(map));
  });
 }catch(e){console.warn('[MAFIVERA life bars]',e);}
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
 return {zone,t:t||{zone_key:zone,owner_id:null,defense_points:25,defense_current:25,garrison:0,building_type:null}};
}

function renderDrawerLife(){
 readSelectedTerritory().then(result=>{
  if(!result)return;
  const body=$('drawerBody');
  if(!body)return;
  const old=body.querySelector('#mtrwTerritoryLife');
  if(old)old.remove();
  const t=result.t;
  const max=maxDefense(t),cur=currentDefense(t),p=percent(t),cls=defenseClass(p);
  const box=document.createElement('section');
  box.id='mtrwTerritoryLife';
  box.className='mtrw-territory-life';
  box.innerHTML=
   '<div class="mtrw-life-head"><span class="mtrw-life-title">❤ Gebiets-Lebensleiste</span><span class="mtrw-life-value">'+fmt(cur)+' / '+fmt(max)+' HP</span></div>'+
   '<div class="mtrw-life-bigtrack"><div class="mtrw-life-bigfill '+cls+'" style="width:'+p.toFixed(1)+'%"></div></div>'+
   '<div class="mtrw-life-percent">'+p.toFixed(0)+' %</div>'+
   '<div class="mtrw-life-desc">Die Lebensleiste zeigt die aktuelle Verteidigung des Gebiets. Schläger und Gebäude beeinflussen den maximalen Verteidigungswert.</div>';
  const stats=body.querySelector('.statgrid');
  if(stats)stats.insertAdjacentElement('afterend',box);else body.prepend(box);

  const oldCombat=body.querySelector('#mtrwCombatBox');if(oldCombat)oldCombat.remove();
  const combat=document.createElement('section');
  combat.id='mtrwCombatBox';combat.className='mtrw-combat-box';
  const building=buildingBonus(t.building_type);
  combat.innerHTML=
   '<h3>⚔️ Kampfwerte</h3>'+
   '<div class="mtrw-combat-grid">'+
   '<div class="mtrw-combat-stat"><b>'+fmt(25)+'</b><small>Grundverteidigung</small></div>'+
   '<div class="mtrw-combat-stat"><b>× 2</b><small>Angriffspunkte je Schläger</small></div>'+
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
 drawerObserver=new MutationObserver(()=>setTimeout(renderDrawerLife,30));
 drawerObserver.observe(body,{childList:true,subtree:true});
 setTimeout(renderDrawerLife,100);
}

async function boot(){
 injectStyle();
 await new Promise(resolve=>{
  let n=0;
  const tick=()=>{
   db=window.db;map=window.__mtrwMap;
   if(db&&map&&window.L)return resolve();
   if(++n>240)return;
   setTimeout(tick,250);
  };
  tick();
 });
 await loadBars();
 map.on('moveend zoomend',()=>loadBars());
 refreshTimer=setInterval(loadBars,5000);
 observeDrawer();
}
boot().catch(e=>console.warn('[MAFIVERA territory bars boot]',e));
})();