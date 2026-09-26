/* MAFIVERA — Heist-Ziel-Analyse · OSM via Supabase Edge Function
   - ermittelt Läden, Banken und ähnliche OSM-Ziele
   - färbt betroffene Spielfelder dunkelrot
   - markiert sie als Event-Felder
   - Event-Felder können serverseitig NICHT von Spielern übernommen werden
*/
(()=>{'use strict';
if(window.__mtrwHeistFieldEngine)return;
window.__mtrwHeistFieldEngine=true;

const GLAT=.0018,GLNG=.0025;
const OVERPASS=['https://overpass-api.de/api/interpreter','https://overpass.kumi.systems/api/interpreter','https://overpass.private.coffee/api/interpreter'];
const cache=new Map(),allCounts=new Map(),rendered=new Map(),tileLayers=new Map();
let map=null,overlay=null,skullLayer=null,lastQueryKey='',busy=false,pending=false,syncBusy=false,fieldPane=null,skullPane=null;

window.__mtrwHeistZones=new Set();
window.__mtrwHeistScanStatus='waiting';

const tileKey=(r,c)=>'z_'+r+'_'+c;
const cell=(lat,lng)=>({r:Math.floor(lat/GLAT),c:Math.floor(lng/GLNG)});
const center=(r,c)=>[(r+.5)*GLAT,(c+.5)*GLNG];
const tileBounds=(r,c)=>[[r*GLAT,c*GLNG],[(r+1)*GLAT,(c+1)*GLNG]];

function css(){
 if(document.getElementById('mtrwHeistFieldCSS'))return;
 const s=document.createElement('style');s.id='mtrwHeistFieldCSS';
 s.textContent=`
 .mtrw-heist-skull{background:transparent!important;border:0!important;width:38px!important;height:38px!important;pointer-events:none!important}
 .mtrw-heist-skull span{display:flex;align-items:center;justify-content:center;width:30px;height:30px;margin:3px;border-radius:50%;background:#13070ae8;border:2px solid #ef4444;box-shadow:0 0 12px #ef4444aa,0 2px 7px #000;font:900 17px/26px system-ui,sans-serif}
 `;
 document.head.appendChild(s);
}

function targetPoint(el){
 if(el.lat!=null&&el.lon!=null)return[Number(el.lat),Number(el.lon)];
 const c=el.center;
 if(c?.lat!=null&&c?.lon!=null)return[Number(c.lat),Number(c.lon)];
 return null;
}

async function queryOne(north,south,east,west){
  const payload={north:Number(north),south:Number(south),east:Number(east),west:Number(west)};
  const jwt=window.db?.auth ? (await window.db.auth.getSession())?.data?.session?.access_token : null;
  try{
    const res=await fetch('https://ufqdntsxgqcxtszufbtv.supabase.co/functions/v1/mafivera-heist-osm',{
      method:'POST',cache:'no-store',
      headers:{
        'Content-Type':'application/json','Accept':'application/json',
        ...(jwt?{Authorization:'Bearer '+jwt}:{})
      },
      body:JSON.stringify(payload)
    });
    const data=await res.json().catch(()=>({}));
    if(!res.ok)throw Error(data?.error||('Heist-OSM HTTP '+res.status));
    return Array.isArray(data?.elements)?data.elements:[];
  }catch(edgeError){
    console.warn('MAFIVERA Heist-OSM Edge:',edgeError);
    const q=`[out:json][timeout:20];(
      nwr["shop"](${south},${west},${north},${east});
      nwr["amenity"~"bank|casino|fuel|pharmacy|post_office|money_transfer"](${south},${west},${north},${east});
      nwr["office"~"bank|insurance"](${south},${west},${north},${east});
    );out center tags;`;
    let lastErr=edgeError;
    for(const endpoint of OVERPASS){
      const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),18000);
      try{
        const res=await fetch(endpoint+'?data='+encodeURIComponent(q),{
          method:'GET',cache:'no-store',headers:{Accept:'application/json'},signal:controller.signal
        });
        if(!res.ok)throw Error('Overpass HTTP '+res.status);
        const data=await res.json();
        return Array.isArray(data?.elements)?data.elements:[];
      }catch(e){lastErr=e}finally{clearTimeout(timeout)}
    }
    throw lastErr||Error('Overpass nicht erreichbar');
  }
}

async function query(north,south,east,west){
  // Supabase Edge Function accepts bboxes up to 0.08°. A phone viewport
  // can be wider/taller than that, so split the visible map into safe
  // chunks instead of sending one invalid_bbox request.
  const MAX=.07, jobs=[];
  for(let s=Number(south);s<Number(north);s+=MAX){
    const n=Math.min(s+MAX,Number(north));
    for(let w=Number(west);w<Number(east);w+=MAX){
      const e=Math.min(w+MAX,Number(east));
      jobs.push(queryOne(n,s,e,w));
    }
  }
  const batches=await Promise.all(jobs);
  const seen=new Set(),out=[];
  for(const batch of batches){
    for(const el of (batch||[])){
      const id=el?.type&&el?.id!=null ? el.type+':'+el.id : null;
      if(id&&seen.has(id))continue;
      if(id)seen.add(id);
      out.push(el);
    }
  }
  return out;
}
function colorFor(count){
 const n=Math.min(Math.max(Number(count)||1,1),8);
 const red=Math.max(48,132-(n-1)*12),green=Math.max(7,28-(n-1)*3),blue=Math.max(9,32-(n-1)*3);
 return {fill:`rgb(${red},${green},${blue})`,border:`rgb(${Math.max(100,red+15)},${Math.max(15,green)},${Math.max(18,blue)})`,opacity:Math.min(.82,.52+(n-1)*.045)};
}

function addTile(k,count){
 if(!map||!overlay||rendered.get(k)===count)return;
 const m=/^z_(-?\d+)_(-?\d+)$/.exec(k);if(!m)return;
 const r=Number(m[1]),c=Number(m[2]),col=colorFor(count);
 const oldRect=tileLayers.get(k),oldSkull=tileLayers.get(k+'#skull');
 if(oldRect){try{overlay.removeLayer(oldRect)}catch(_){}}
 if(oldSkull){try{skullLayer.removeLayer(oldSkull)}catch(_){}}
 const rect=L.rectangle(tileBounds(r,c),{pane:'mtrwHeistFieldPane',bubblingMouseEvents:false,color:col.border,weight:2,fillColor:col.fill,fillOpacity:.88,interactive:true,className:'mtrw-heist-field'}).addTo(overlay);
 const[lat,lng]=center(r,c);
 const level=count>=8?3:count>=4?2:1;
 const marker=L.marker([lat,lng],{pane:'mtrwHeistSkullPane',interactive:false,zIndexOffset:1100,icon:L.divIcon({className:'mtrw-heist-skull',html:'<span title="Heist-Stufe '+level+'">💀</span>',iconSize:[38,38],iconAnchor:[19,19]})}).addTo(skullLayer);
 tileLayers.set(k,rect);tileLayers.set(k+'#skull',marker);rendered.set(k,count);rect.on('click',()=>window.mtrwOpenHeistField?.(k,count));
}

function redraw(){
 if(!map||!overlay)return;
 overlay.clearLayers();skullLayer?.clearLayers();rendered.clear();
 for(const[k,count]of allCounts)addTile(k,count);
 window.__mtrwHeistZones=new Set(allCounts.keys());
 window.mtrwRefreshResourceMarkers?.();
 window.mtrwRefreshTerritoryHeistUI?.();
}

async function syncServer(){
 if(syncBusy||!window.db||!allCounts.size)return;
 syncBusy=true;
 try{
   const zones=[...allCounts.keys()].filter(k=>!!(window.__mtrwWorld||{})[k]);
   if(!zones.length)return;
   const session=window.db.auth ? (await window.db.auth.getSession())?.data?.session : null;
   if(!session){
     setTimeout(()=>{syncBusy=false;syncServer()},1000);
     return;
   }

   // Register each detected field independently first. This keeps the
   // Heist usable even if the bulk owner-cleanup sync has a transient error.
   for(const zone of zones){
     try{await window.db.rpc('mtrw_register_heist_field',{p_zone_key:zone})}
     catch(e){console.warn('MAFIVERA Heist register:',zone,e)}
   }

   try{
     let r=await window.db.rpc('mtrw_sync_heist_fields',{p_zones:zones});
     if(r.error){
       await new Promise(ok=>setTimeout(ok,500));
       r=await window.db.rpc('mtrw_sync_heist_fields',{p_zones:zones});
     }
     if(!r.error && Number(r.data?.owners_cleared||0)>0){
       window.dispatchEvent(new CustomEvent('mtrw-heist-owners-cleared',{detail:r.data}));
     }
   }catch(e){console.warn('MAFIVERA Heist bulk sync:',e)}

   window.__mtrwHeistZones=new Set(zones);
   window.mtrwRefreshTerritoryHeistUI?.();
 }catch(e){
   console.warn('MAFIVERA Heist-Sync:',e);
 }finally{syncBusy=false}
}

async function loadCentralHeistFields(){
 if(!map||!window.db)return false;
 try{
   const bounds=map.getBounds(),world=window.__mtrwWorld||{};
   const r=await window.db.from('mtrw_heist_fields').select('zone_key,target_count');
   if(r.error)throw r.error;
   const rows=Array.isArray(r.data)?r.data:[];
   allCounts.clear();
   for(const row of rows){
     const k=String(row?.zone_key||''),w=world[k];
     if(!w)continue;
     const lat=Number(w.center_lat),lng=Number(w.center_lng);
     if(Number.isFinite(lat)&&Number.isFinite(lng)&&bounds.contains([lat,lng]))
       allCounts.set(k,Math.max(1,Number(row.target_count)||1));
   }
   redraw();
   window.__mtrwHeistScanStatus=rows.length?'central-ready':'waiting';
   return rows.length>0;
 }catch(e){
   window.__mtrwHeistScanStatus='error';
   console.warn('MAFIVERA zentrale Heistkarte:',e);
   return false;
 }
}

async function ensureCentralHeistWorld(){
 try{
   const status=await window.db.rpc('mtrw_heist_world_sync_status');
   if(status.error)throw status.error;
   let d=status.data||{};

   if(Number(d.field_count)>0||d.status==='ready'){
     await loadCentralHeistFields();
     return;
   }

   // The world build is a one-time server operation. Use GET so the
   // browser does not need a CORS preflight for the public sync trigger.
   const res=await fetch('https://ufqdntsxgqcxtszufbtv.supabase.co/functions/v1/mafivera-heist-osm?sync_world=true',{
     method:'GET',cache:'no-store',headers:{Accept:'application/json'}
   });
   const out=await res.json().catch(()=>({}));
   if(!res.ok)throw Error(out?.error||('world_sync_http_'+res.status));

   // If another player is currently building the world, wait for that
   // central sync to finish instead of treating an empty table as final.
   if(out?.status==='syncing'){
     const until=Date.now()+90000;
     while(Date.now()<until){
       await new Promise(ok=>setTimeout(ok,3000));
       const s=await window.db.rpc('mtrw_heist_world_sync_status');
       if(s.error)break;
       d=s.data||{};
       if(Number(d.field_count)>0||d.status==='ready')break;
     }
   }

   await loadCentralHeistFields();
 }catch(e){
   console.warn('MAFIVERA Heist-Welt-Sync:',e);
   await loadCentralHeistFields();
 }
}
function refreshCentralHeistView(){
 loadCentralHeistFields();
}


function boot(){
 map=window.__mtrwMap;if(!map||typeof L==='undefined')return;
 css();
 fieldPane=map.getPane('mtrwHeistFieldPane')||map.createPane('mtrwHeistFieldPane');fieldPane.style.zIndex='900';fieldPane.style.pointerEvents='auto';
 skullPane=map.getPane('mtrwHeistSkullPane')||map.createPane('mtrwHeistSkullPane');skullPane.style.zIndex='950';skullPane.style.pointerEvents='none';
 overlay=L.layerGroup().addTo(map);skullLayer=L.layerGroup().addTo(map);

 const waitForWorld=()=>{
   if(!Object.keys(window.__mtrwWorld||{}).length)return false;
   clearInterval(window.__mtrwHeistWorldWait);
   // First paint comes from the central database, not from a fresh OSM scan.
   ensureCentralHeistWorld();
   return true;
 };
 if(!waitForWorld()){
   clearInterval(window.__mtrwHeistWorldWait);
   window.__mtrwHeistWorldWait=setInterval(()=>waitForWorld(),250);
   setTimeout(()=>clearInterval(window.__mtrwHeistWorldWait),30000);
 }
 map.on('moveend',refreshCentralHeistView);
 map.on('zoomend',refreshCentralHeistView);
 clearInterval(window.__mtrwHeistRefreshTimer);
 // Refresh the visible slice only; never re-run OSM.
 window.__mtrwHeistRefreshTimer=setInterval(refreshCentralHeistView,30000);
 window.mtrwRefreshHeistFields=refreshCentralHeistView;
}
const wait=setInterval(()=>{if(window.__mtrwMap){clearInterval(wait);boot()}},250);setTimeout(()=>clearInterval(wait),30000);
})();