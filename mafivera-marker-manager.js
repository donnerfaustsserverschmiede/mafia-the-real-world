/* MAFIVERA V2 — stable map marker engine
   Owns resource/building markers without redraw flicker.
   The legacy marker output from mafivera-v1.js is hidden; this manager keeps
   one persistent marker per visible resource/building and only reconciles when
   the visible cell set actually changes. Dealer remains owned by dealer-v2. */
(()=>{'use strict';
if(window.__mtrwStableMarkerManager)return;
window.__mtrwStableMarkerManager=true;

const GLAT=.0018,GLNG=.0025,R=5;
let map=null,db=null,uid=null,world={},markers=new Map(),lastViewKey='';

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const zkey=(r,c)=>`z_${r}_${c}`;
const center=(r,c)=>[(r+.5)*GLAT,(c+.5)*GLNG];
const res=(r,c)=>{const h=Math.abs((r*73856093)^(c*19349663))%6;return h===0?['money','material']:h===1?['material','reputation']:h===2?['money','reputation']:h===3?['material','money']:h===4?['reputation','money']:['material','reputation']};
const ri=x=>x==='money'?'$':x==='material'?'▣':'★';
const globalCell=(lat,lng)=>({r:Math.floor(lat/GLAT),c:Math.floor(lng/GLNG)});

function addStyle(){
  if(document.getElementById('mtrwStableMarkerCSS'))return;
  const s=document.createElement('style');s.id='mtrwStableMarkerCSS';
  s.textContent=`
    /* main-runtime marker output is retired; stable manager renders these */
    .res-marker,.building-marker{display:none!important}
    .mtrw-stable-res-marker{background:transparent!important;border:0!important;width:24px!important;height:24px!important;pointer-events:none!important}
    .mtrw-stable-res-marker span{display:flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:50%;font:900 13px/24px system-ui,sans-serif;background:#111a;color:#fff;text-shadow:0 1px 2px #000;box-shadow:0 2px 7px #0009}
    .mtrw-stable-res-marker .money{color:#f3c64d}
    .mtrw-stable-res-marker .material{color:#b9d3ff}
    .mtrw-stable-res-marker .reputation{color:#ff8ee6}
    .mtrw-stable-building-marker{background:transparent!important;border:0!important;width:100px!important;height:52px!important;pointer-events:none!important}
    .mtrw-stable-building-marker span{font-size:27px;line-height:28px;display:block;text-align:center;text-shadow:0 2px 5px #000}
    .mtrw-stable-building-marker b{display:block;max-width:100px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:center;font:800 9px/13px system-ui,sans-serif;color:#fff;background:#171b22e8;border:1px solid #ffffff33;border-radius:6px;padding:1px 4px;box-shadow:0 2px 6px #0009}
  `;
  document.head.appendChild(s);
}

function buildingInfo(type){
  const B={warehouse:['📦','Lager'],money:['💵','Geldwäsche'],club:['🥃','Clubhaus'],lab:['⚗️','Chemielabor'],market:['🕶️','Schwarzmarkt'],watch:['🛡️','Wachposten'],hideout:['🏚️','Gangversteck'],recruitment:['👤','Rekrutierungszentrum']};
  return B[type]||['🏗️',type||'Gebäude'];
}

function markerKey(kind,zone,extra=''){return `${kind}:${zone}:${extra}`}
function removeKey(k){const m=markers.get(k);if(m){m.remove();markers.delete(k)}}

function ensureResource(k,pos,p){
  const old=markers.get(k);if(old){old.setLatLng(pos);return}
  const m=L.marker(pos,{interactive:false,zIndexOffset:100,icon:L.divIcon({className:'mtrw-stable-res-marker',html:`<span class="${p}">${ri(p)}</span>`,iconSize:[24,24],iconAnchor:[12,12]})}).addTo(map);
  markers.set(k,m);
}

function ensureBuilding(k,pos,t){
  const old=markers.get(k);if(old){old.setLatLng(pos);return}
  const [icon,name]=buildingInfo(t.building_type),finished=!t.building_finish_at||new Date(t.building_finish_at)<=new Date();
  const m=L.marker(pos,{interactive:false,zIndexOffset:250,icon:L.divIcon({className:'mtrw-stable-building-marker',html:`<span>${icon}</span><b>${esc(name)}${finished?'':' · im Bau'}</b>`,iconSize:[100,52],iconAnchor:[50,26]})}).addTo(map);
  markers.set(k,m);
}

function render(){
  if(!map)return;
  const bc=globalCell(map.getCenter().lat,map.getCenter().lng);
  const viewKey=`${bc.r}:${bc.c}`;
  if(viewKey===lastViewKey)return;
  lastViewKey=viewKey;
  const wanted=new Set();
  for(let r=bc.r-R;r<=bc.r+R;r++)for(let c=bc.c-R;c<=bc.c+R;c++){
    const zone=zkey(r,c),[lat,lng]=center(r,c);
    res(r,c).forEach((p,i)=>{
      const k=markerKey('res',zone,String(i));
      wanted.add(k);
      ensureResource(k,[lat+(i===0?-.00025:.00025),lng+(i===0?-.00032:.00032)],p);
    });
    const t=world[zone];
    if(t?.building_type){
      const k=markerKey('building',zone);
      wanted.add(k);ensureBuilding(k,[lat,lng],t);
    }
  }
  [...markers.keys()].forEach(k=>{if(!wanted.has(k))removeKey(k)});
}

async function loadWorld(){
  if(!db)return;
  const q=await db.from('world_territories').select('zone_key,building_type,building_finish_at');
  if(q.error)return;
  world={};(q.data||[]).forEach(t=>{world[t.zone_key]=t});
  lastViewKey='';render();
}

async function boot(){
  db=window.db;
  if(!db)return;
  const s=await db.auth.getSession();uid=s.data.session?.user?.id||null;
  map=window.__mtrwMap;
  if(!map)return;
  addStyle();
  render();
  map.on('moveend',render);
  map.on('zoomend',()=>{lastViewKey='';render()});
  await loadWorld();
  db.channel('mtrw-stable-marker-world').on('postgres_changes',{event:'*',schema:'public',table:'world_territories'},()=>loadWorld()).subscribe();
}

const wait=setInterval(()=>{
  if(window.db&&window.__mtrwMap){clearInterval(wait);boot()}
},250);
setTimeout(()=>clearInterval(wait),30000);
})();
