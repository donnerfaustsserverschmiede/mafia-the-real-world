/* MAFIVERA — territory life bars & combat points UI
   Isolated layer: does not alter the stable map runtime.
*/
(()=>{'use strict';
if(window.__mtrwTerritoryBars)return;window.__mtrwTerritoryBars=true;
let db=null,map=null,markers=[],refreshTimer=null;
const $=id=>document.getElementById(id);
const fmt=n=>Number(n||0).toLocaleString('de-DE');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const buildingBonus=t=>({warehouse:25,money:35,club:40,lab:45,market:50,watch:60,hideout:65,recruitment:75,headquarters:100}[t]||0);
const maxDefense=t=>25+buildingBonus(t?.building_type)+(Math.max(0,Number(t?.garrison||0))*2);
const currentDefense=t=>Math.max(0,Math.min(maxDefense(t),Number(t?.defense_current??t?.defense_points??25)));
const pct=t=>Math.max(0,Math.min(100,currentDefense(t)/Math.max(1,maxDefense(t))*100));
function style(){
 if($('mtrwLifeCSS'))return;
 const s=document.createElement('style');s.id='mtrwLifeCSS';s.textContent=
 '.mtrw-life-marker{background:transparent!important;border:0!important;width:76px!important;height:30px!important;pointer-events:none}'+\n'.mtrw-life-wrap{width:76px;margin-top:2px;filter:drop-shadow(0 2px 3px #000)}'+
'.mtrw-life-label{font:800 9px/1 system-ui;color:#fff;text-align:center;margin-bottom:3px;text-shadow:0 1px 2px #000}'+
'.mtrw-life-track{height:6px;border:1px solid #101820;border-radius:8px;background:#252b31;overflow:hidden}'+
'.mtrw-life-fill{height:100%;border-radius:8px;background:#45d483;transition:width .4s ease}'+
'.mtrw-life-fill.mid{background:#f0b53c}.mtrw-life-fill.low{background:#e45a55}'+
'.mtrw-combat-box{margin:10px 0;padding:12px;border:1px solid #34404d;border-radius:14px;background:#121923}'+
'.mtrw-combat-box h3{margin:0 0 9px;font-size:14px}'+
'.mtrw-combat-grid{display:grid;grid-template-columns:1fr 1fr;gap:7px}'+
'.mtrw-combat-stat{padding:9px;border-radius:10px;background:#171f2a;border:1px solid #293542}'+
'.mtrw-combat-stat b{display:block;font-size:15px}.mtrw-combat-stat small{color:#8e9aaa;font-size:9px}'+
'.mtrw-xp-note{margin-top:8px;color:#8e9aaa;font-size:9px;line-height:1.35}';
 document.head.appendChild(s)
}
function clear(){markers.forEach(m=>m.remove());markers=[]}
async function load(){
 if(!db||!map)return;
 try{
  const q=await db.from('world_territories').select('zone_key,owner_id,center_lat,center_lng,defense_points,defense_current,garrison,building_type,building_level').not('owner_id','is',null);
  if(q.error)throw q.error;clear();
  (q.data||[]).forEach(t=>{
   const max=maxDefense(t),cur=currentDefense(t),p=pct(t),cls=p<35?'low':p<70?'mid':'';
   const html='<div class="mtrw-life-wrap"><div class="mtrw-life-label">❤ '+fmt(cur)+'/'+fmt(max)+'</div><div class="mtrw-life-track"><div class="mtrw-life-fill '+cls+'" style="width:'+p.toFixed(1)+'%"></div></div></div>';
   const icon=L.divIcon({className:'mtrw-life-marker',html,iconSize:[76,30],iconAnchor:[38,0]});
   markers.push(L.marker([Number(t.center_lat),Number(t.center_lng)],{icon,interactive:false,zIndexOffset:500}).addTo(map));
  });
 }catch(e){console.warn('[MAFIVERA life bars]',e)}
}
function panel(){
 const title=$('drawerTitle'),body=$('drawerBody');if(!title||!body||title.textContent!=='Gebiet')return;if(body.querySelector('#mtrwCombatBox'))return;
 const text=body.textContent||'',m=text.match(/Verteidigung\s*([0-9.]+)/);if(!m)return;
 const displayed=Number(m[1].replace(/\./g,''));
 const box=document.createElement('section');box.id='mtrwCombatBox';box.className='mtrw-combat-box';
 box.innerHTML='<h3>⚔️ Kampfwerte</h3><div class="mtrw-combat-grid"><div class="mtrw-combat-stat"><b>'+fmt(displayed)+'</b><small>aktuelle Verteidigung</small></div><div class="mtrw-combat-stat"><b>× 2</b><small>Angriffspunkte je Schläger</small></div></div><div class="mtrw-xp-note">❤ Die Kachelleiste zeigt die verbleibende Verteidigung. Gebäude und stationierte Schläger erhöhen den maximalen Verteidigungswert. Eine erfolgreiche Eroberung bringt +25 XP.</div>';
 body.querySelector('.hint')?.before(box);
}
async function boot(){
 style();await new Promise(resolve=>{let n=0;const tick=()=>{db=window.db;map=window.__mtrwMap;if(db&&map&&window.L)return resolve();if(++n>240)return;setTimeout(tick,250)};tick()});
 await load();refreshTimer=setInterval(load,5000);
 const body=$('drawerBody');if(body)new MutationObserver(()=>panel()).observe(body,{childList:true,subtree:true});
}
boot().catch(e=>console.warn('[MAFIVERA territory bars boot]',e));
})();