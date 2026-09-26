/* MAFIVERA — Global Heist Fields
   Central authoritative model:
   OSM -> Supabase Edge Function -> mtrw_heist_fields -> all players.
   The client never treats OSM as the game state and never removes stored fields.
*/
(()=>{'use strict';
if(window.__mtrwHeistFieldEngine)return;
window.__mtrwHeistFieldEngine=true;

const GLAT=.0018,GLNG=.0025;
const EDGE='https://ufqdntsxgqcxtszufbtv.supabase.co/functions/v1/mafivera-heist-osm';
let map=null,overlay=null,skullLayer=null,fieldPane=null,skullPane=null,busy=false;
const counts=new Map(),rendered=new Map(),layers=new Map();

window.__mtrwHeistZones=new Set();
window.__mtrwHeistScanStatus='waiting';

const tileKey=(lat,lng)=>'z_'+Math.floor(Number(lat)/GLAT)+'_'+Math.floor(Number(lng)/GLNG);
const tileCenter=(key)=>{
  const m=/^z_(-?\d+)_(-?\d+)$/.exec(String(key));
  if(!m)return null;
  return [(Number(m[1])+.5)*GLAT,(Number(m[2])+.5)*GLNG];
};
const tileBounds=(key)=>{
  const m=/^z_(-?\d+)_(-?\d+)$/.exec(String(key));
  if(!m)return null;
  const r=Number(m[1]),c=Number(m[2]);
  return [[r*GLAT,c*GLNG],[(r+1)*GLAT,(c+1)*GLNG]];
};

function css(){
 if(document.getElementById('mtrwHeistFieldCSS'))return;
 const s=document.createElement('style');s.id='mtrwHeistFieldCSS';
 s.textContent='.mtrw-heist-skull{background:transparent!important;border:0!important;width:38px!important;height:38px!important;pointer-events:none!important}.mtrw-heist-skull span{display:flex;align-items:center;justify-content:center;width:30px;height:30px;margin:3px;border-radius:50%;background:#13070ae8;border:2px solid #ef4444;box-shadow:0 0 12px #ef4444aa,0 2px 7px #000;font:900 17px/26px system-ui,sans-serif}.mtrw-heist-field{cursor:pointer!important}';
 document.head.appendChild(s);
}
function styleFor(n){
 n=Math.max(1,Math.min(8,Number(n)||1));
 const red=Math.max(48,132-(n-1)*12),green=Math.max(7,28-(n-1)*3),blue=Math.max(9,32-(n-1)*3);
 return {fill:'rgb('+red+','+green+','+blue+')',border:'rgb('+Math.max(100,red+15)+','+Math.max(15,green)+','+Math.max(18,blue)+')'};
}
function addTile(k,count){
 if(!map||!overlay||rendered.get(k)===count)return;
 const b=tileBounds(k),c=tileCenter(k);if(!b||!c)return;
 const old=layers.get(k),oldS=layers.get(k+'#skull');
 if(old)try{overlay.removeLayer(old)}catch(_){}
 if(oldS)try{skullLayer.removeLayer(oldS)}catch(_){}
 const col=styleFor(count);
 const rect=L.rectangle(b,{pane:'mtrwHeistFieldPane',bubblingMouseEvents:false,color:col.border,weight:2,fillColor:col.fill,fillOpacity:.88,interactive:true,className:'mtrw-heist-field'}).addTo(overlay);
 const level=count>=8?3:count>=4?2:1;
 const marker=L.marker(c,{pane:'mtrwHeistSkullPane',interactive:false,zIndexOffset:1100,icon:L.divIcon({className:'mtrw-heist-skull',html:'<span title="Heist-Stufe '+level+'">💀</span>',iconSize:[38,38],iconAnchor:[19,19]})}).addTo(skullLayer);
 layers.set(k,rect);layers.set(k+'#skull',marker);rendered.set(k,count);try{rect.bringToFront()}catch(_){}
 rect.on('click',()=>window.mtrwOpenHeistField?.(k,count));
}
function redraw(){
 if(!map||!overlay)return;
 overlay.clearLayers();skullLayer.clearLayers();rendered.clear();layers.clear();
 for(const [k,n] of counts)addTile(k,n);
 window.__mtrwHeistZones=new Set(counts.keys());
 window.__mtrwHeistFieldCount=counts.size;
 window.mtrwRefreshResourceMarkers?.();
 window.mtrwRefreshTerritoryHeistUI?.();
 window.dispatchEvent(new CustomEvent('mtrw:heist-cells-updated'));
}
async function syncViewport(){
 if(busy||!map)return;
 const b=map.getBounds();
 let south=b.getSouth(),west=b.getWest(),north=b.getNorth(),east=b.getEast();
 if(east<west)east+=360;
 const MAX=.07;
 busy=true;
 try{
   const jobs=[];
   for(let s=south;s<north;s+=MAX){
     const nn=Math.min(north,s+MAX);
     for(let w=west;w<east;w+=MAX){
       const ee=Math.min(east,w+MAX);
       jobs.push(fetch(EDGE,{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json','Accept':'application/json'},
         body:JSON.stringify({south:s,west:w,north:nn,east:ee})}).then(async r=>({ok:r.ok,data:await r.json().catch(()=>({}))})).catch(e=>({ok:false,data:{error:String(e)}})));
     }
   }
   const results=await Promise.all(jobs);
   window.__mtrwHeistScanStatus=results.some(x=>x.ok)?'central-ready':'error';
 }finally{busy=false}
 await loadCentral();
}
async function loadCentral(){
 if(!map||!window.db)return;
 try{
   const b=map.getBounds();
   const q=await window.db.from('mtrw_heist_fields')
     .select('zone_key,target_count,center_lat,center_lng')
     .gte('center_lat',b.getSouth()).lte('center_lat',b.getNorth())
     .gte('center_lng',b.getWest()).lte('center_lng',b.getEast());
   if(q.error)throw q.error;
   counts.clear();
   for(const row of (q.data||[])){
     const k=String(row.zone_key||'');
     const lat=Number(row.center_lat),lng=Number(row.center_lng);
     if(k&&Number.isFinite(lat)&&Number.isFinite(lng))
       counts.set(k,Math.max(1,Number(row.target_count)||1));
   }
   redraw();
 }catch(e){
   window.__mtrwHeistScanStatus='error';
   console.warn('MAFIVERA zentrale Heistkarte:',e);
 }
}
async function refresh(){
 // First ask the server to discover only the current geographic slice.
 // The result is persisted centrally and is then rendered from Supabase.
 await syncViewport();
}
function boot(){
 map=window.__mtrwMap;
 if(!map||typeof L==='undefined')return;
 css();
 fieldPane=map.getPane('mtrwHeistFieldPane')||map.createPane('mtrwHeistFieldPane');
 fieldPane.style.zIndex='900';fieldPane.style.pointerEvents='auto';
 skullPane=map.getPane('mtrwHeistSkullPane')||map.createPane('mtrwHeistSkullPane');
 skullPane.style.zIndex='950';skullPane.style.pointerEvents='none';
 overlay=L.layerGroup().addTo(map);skullLayer=L.layerGroup().addTo(map);
 window.mtrwRefreshHeistFields=refresh;
 map.on('moveend',refresh);
 map.on('zoomend',refresh);
 clearInterval(window.__mtrwHeistRefreshTimer);
 window.__mtrwHeistRefreshTimer=setInterval(loadCentral,30000);
 refresh();
}
const wait=setInterval(()=>{if(window.__mtrwMap&&window.db){clearInterval(wait);boot()}},250);
setTimeout(()=>clearInterval(wait),30000);
})();