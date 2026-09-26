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
let map=null,overlay=null,skullLayer=null,lastQueryKey='',busy=false,pending=false,syncBusy=false;

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
 .mtrw-heist-legend{position:absolute;left:10px;bottom:10px;z-index:1200;background:#111827e8;color:#fff;border:1px solid #7f1d1d;border-radius:9px;padding:5px 8px;font:800 10px system-ui,sans-serif;pointer-events:auto}
 `;
 document.head.appendChild(s);
}

function targetPoint(el){
 if(el.lat!=null&&el.lon!=null)return[Number(el.lat),Number(el.lon)];
 const c=el.center;
 if(c?.lat!=null&&c?.lon!=null)return[Number(c.lat),Number(c.lon)];
 return null;
}

async function query(north,south,east,west){
  const payload={north:Number(north),south:Number(south),east:Number(east),west:Number(west)};
  const jwt=window.db?.auth ? (await window.db.auth.getSession())?.data?.session?.access_token : null;

  // OSM is queried through our Supabase Edge Function. This avoids browser
  // CORS/network restrictions that made direct Overpass requests silently fail
  // in the installed/Android browser.
  try{
    const res=await fetch('https://ufqdntsxgqcxtszufbtv.supabase.co/functions/v1/mafivera-heist-osm',{
      method:'POST',
      cache:'no-store',
      headers:{
        'Content-Type':'application/json',
        'Accept':'application/json',
        ...(jwt?{Authorization:'Bearer '+jwt}:{})
      },
      body:JSON.stringify(payload)
    });
    const data=await res.json().catch(()=>({}));
    if(!res.ok)throw Error(data?.error||('Heist-OSM HTTP '+res.status));
    return Array.isArray(data?.elements)?data.elements:[];
  }catch(edgeError){
    console.warn('MAFIVERA Heist-OSM Edge:',edgeError);
    // Fallback for environments where the Edge Function is temporarily
    // unavailable. The client still tries public Overpass endpoints.
    const q=`[out:json][timeout:20];(
      nwr["shop"](${south},${west},${north},${east});
      nwr["amenity"~"bank|casino|fuel|pharmacy|post_office|money_transfer"](${south},${west},${north},${east});
      nwr["office"~"bank|insurance"](${south},${west},${north},${east});
    );out center tags;`;
    let lastErr=edgeError;
    for(const endpoint of OVERPASS){
      const controller=new AbortController();
      const timeout=setTimeout(()=>controller.abort(),18000);
      try{
        const res=await fetch(endpoint+'?data='+encodeURIComponent(q),{
          method:'GET',cache:'no-store',headers:{Accept:'application/json'},signal:controller.signal
        });
        if(!res.ok)throw Error('Overpass HTTP '+res.status);
        const data=await res.json();
        return data.elements||[];
      }catch(e){lastErr=e}
      finally{clearTimeout(timeout)}
    }
    throw lastErr||Error('Overpass nicht erreichbar');
  }
}
function colorFor(count){
 const n=Math.min(Math.max(Number(count)||1,1),8);
 const red=Math.max(48,132-(n-1)*12),green=Math.max(7,28-(n-1)*3),blue=Math.max(9,32-(n-1)*3);
 return {fill:`rgb(${red},${green},${blue})`,border:`rgb(${Math.max(100,red+15)},${Math.max(15,green)},${Math.max(18,blue)})`,opacity:Math.min(.82,.52+(n-1)*.045)};
}

function addTile(k,count){
 if(!map||!overlay||rendered.get(k)===count)return;
 const m=/^z_(-?\\d+)_(-?\\d+)$/.exec(k);if(!m)return;
 const r=Number(m[1]),c=Number(m[2]),col=colorFor(count);
 const oldRect=tileLayers.get(k),oldSkull=tileLayers.get(k+'#skull');
 if(oldRect){try{overlay.removeLayer(oldRect)}catch(_){}}
 if(oldSkull){try{skullLayer.removeLayer(oldSkull)}catch(_){}}
 const rect=L.rectangle(tileBounds(r,c),{color:col.border,weight:1,fillColor:col.fill,fillOpacity:col.opacity,interactive:true,className:'mtrw-heist-field'}).addTo(overlay);
 const[lat,lng]=center(r,c);
 const marker=L.marker([lat,lng],{interactive:false,zIndexOffset:1100,icon:L.divIcon({className:'mtrw-heist-skull',html:'<span>💀</span>',iconSize:[38,38],iconAnchor:[19,19]})}).addTo(skullLayer);
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
   const zones=[...allCounts.keys()];
   const r=await window.db.rpc('mtrw_sync_heist_fields',{p_zones:zones});
   if(r.error)throw r.error;
   window.__mtrwHeistZones=new Set(zones);
   window.mtrwRefreshTerritoryHeistUI?.();
   if(Number(r.data?.owners_cleared||0)>0){
     window.dispatchEvent(new CustomEvent('mtrw-heist-owners-cleared',{detail:r.data}));
   }
 }catch(e){console.warn('MAFIVERA Heist-Sync:',e)}
 finally{syncBusy=false}
}

async function refresh(force=false){
 if(!map)return;
 const b=map.getBounds(),south=b.getSouth(),west=b.getWest(),north=b.getNorth(),east=b.getEast(),step=.05;
 const key=[Math.floor(south/step),Math.floor(west/step),Math.floor(north/step),Math.floor(east/step)].join(':');
 if(busy){pending=true;return}
 if(!force&&key===lastQueryKey)return;
 busy=true;
 try{
   lastQueryKey=key;
   window.__mtrwHeistScanStatus='scanning';
   let counts=cache.get(key);
   if(!counts){
     const elements=await query(north,south,east,west);counts={};
     for(const el of elements){
       const p=targetPoint(el);if(!p||!Number.isFinite(p[0])||!Number.isFinite(p[1]))continue;
       const q=cell(p[0],p[1]),k=tileKey(q.r,q.c);counts[k]=(counts[k]||0)+1;
     }
     cache.set(key,counts);
   }
   allCounts.clear();
   for(const[k,count]of Object.entries(counts||{})){const n=Number(count)||0;if(n>0)allCounts.set(k,n)}
   redraw();
   window.__mtrwHeistScanStatus='ok';
   await syncServer();
 }catch(e){window.__mtrwHeistScanStatus='error';console.warn('MAFIVERA Heist-Ziele:',e)}
 finally{
   busy=false;
   if(pending){pending=false;const now=map?.getBounds();if(now){
     const nk=[Math.floor(now.getSouth()/.05),Math.floor(now.getWest()/.05),Math.floor(now.getNorth()/.05),Math.floor(now.getEast()/.05)].join(':');
     if(nk!==lastQueryKey)refresh(false);
   }}
 }
}

function boot(){
 map=window.__mtrwMap;if(!map||typeof L==='undefined')return;
 css();overlay=L.layerGroup().addTo(map);skullLayer=L.layerGroup().addTo(map);
 const legend=document.createElement('div');legend.className='mtrw-heist-legend';
 legend.innerHTML='💀 Heist-Ziel · Event-Feld · <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener" style="color:#ddd;text-decoration:none">© OpenStreetMap</a>';
 const host=document.querySelector('.mf-map');if(host&&!host.querySelector('.mtrw-heist-legend'))host.appendChild(legend);
 refresh(true);
 map.once('load',()=>refresh(true));setTimeout(()=>refresh(true),3000);setTimeout(()=>refresh(true),10000);map.on('moveend',()=>refresh(false));map.on('zoomend',()=>refresh(false));clearInterval(window.__mtrwHeistRefreshTimer);window.__mtrwHeistRefreshTimer=setInterval(()=>refresh(true),120000);
 window.mtrwRefreshHeistFields=()=>refresh(true);
}
const wait=setInterval(()=>{if(window.__mtrwMap){clearInterval(wait);boot()}},250);setTimeout(()=>clearInterval(wait),30000);
})();