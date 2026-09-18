/* MAFIVERA – server-backed persistent heist fields */
(()=>{'use strict';
if(window.__mtrwPlaceOverlay)return;window.__mtrwPlaceOverlay=true;
const GLAT=.0018,GLNG=.0025,DISPLAY_RADIUS=7;
let heistLayer=null,heistRects=new Map,heistMarkers=new Map;
let loading=false,pending=false,lastSig='';
window.__mtrwHeistCells=window.__mtrwHeistCells||new Set();

function syncHeistMarkers(){
 const m=window.__mtrwMap;if(!m)return;
 if(!heistLayer){
  if(!m.getPane('mtrwHeistPane')){
   const pane=m.createPane('mtrwHeistPane');
   pane.style.zIndex='470';pane.style.pointerEvents='none';
  }
  heistLayer=L.layerGroup().addTo(m);
 }
 const loc=window.__mtrwPlayerLocation;
 if(!loc)return;
 const pc={r:Math.floor(loc.lat/GLAT),c:Math.floor(loc.lng/GLNG)},wanted=new Set();
 for(let r=pc.r-DISPLAY_RADIUS;r<=pc.r+DISPLAY_RADIUS;r++)
  for(let c=pc.c-DISPLAY_RADIUS;c<=pc.c+DISPLAY_RADIUS;c++){
   const key='z_'+r+'_'+c;
   if(window.__mtrwHeistCells.has(key))wanted.add(key);
  }
 heistRects.forEach((rect,key)=>{
  if(!wanted.has(key)){rect.remove();heistRects.delete(key);const mk=heistMarkers.get(key);mk?.remove();heistMarkers.delete(key)}
 });
 wanted.forEach(key=>{
  if(heistRects.has(key))return;
  const p=/^z_(-?\d+)_(-?\d+)$/.exec(key);if(!p)return;
  const r=+p[1],c=+p[2];
  const rect=L.rectangle([[r*GLAT,c*GLNG],[(r+1)*GLAT,(c+1)*GLNG]],{
   color:'#8f2632',weight:2,fillColor:'#5b1018',fillOpacity:.58,interactive:false,pane:'mtrwHeistPane'
  }).addTo(heistLayer);
  heistRects.set(key,rect);
  const marker=L.marker([(r+.5)*GLAT,(c+.5)*GLNG],{
   interactive:false,zIndexOffset:900,
   icon:L.divIcon({className:'mtrw-heist-marker',html:'<span style="font-size:28px;line-height:34px;text-shadow:0 2px 6px #000">💼</span>',iconSize:[34,34],iconAnchor:[17,17]})
  }).addTo(heistLayer);
  heistMarkers.set(key,marker);
 });
}

async function loadHeistCells(){
 const m=window.__mtrwMap;if(!m||!window.db?.functions)return;
 if(loading){pending=true;return}
 const loc=window.__mtrwPlayerLocation;if(!loc)return;
 const south=loc.lat-DISPLAY_RADIUS*GLAT,north=loc.lat+DISPLAY_RADIUS*GLAT,west=loc.lng-DISPLAY_RADIUS*GLNG,east=loc.lng+DISPLAY_RADIUS*GLNG;
 const sig=[south.toFixed(4),west.toFixed(4),north.toFixed(4),east.toFixed(4)].join(',');
 if(sig===lastSig){syncHeistMarkers();return}
 lastSig=sig;loading=true;
 try{
  const {data,error}=await window.db.functions.invoke('heist-fields',{
   body:{south,west,north,east}
  });
  if(error)throw error;
  for(const key of (data?.cells||[]))window.__mtrwHeistCells.add(key);
  syncHeistMarkers();
  window.dispatchEvent(new CustomEvent('mtrw:heist-cells-updated'));
 }catch(e){console.debug('MAFIVERA heist fields:',e?.message||e)}
 finally{loading=false;if(pending){pending=false;setTimeout(loadHeistCells,50)}}
}

window.mtrwRefreshHeistFields=()=>{lastSig='';return loadHeistCells()};
window.mtrwSyncHeistMarkers=syncHeistMarkers;

function hook(){
 const m=window.__mtrwMap;
 if(!m)return setTimeout(hook,300);
 loadHeistCells();
 m.on('moveend',()=>{syncHeistMarkers();loadHeistCells()});
 m.on('zoomend',syncHeistMarkers);
 setInterval(loadHeistCells,60000);
}
hook();
})();