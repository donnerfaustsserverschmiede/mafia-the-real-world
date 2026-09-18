/* MAFIVERA – Real-world place field overlay */
(()=>{'use strict';
if(window.__mtrwPlaceOverlay)return;window.__mtrwPlaceOverlay=true;
const db=window.db;
if(!db)return;
const DARK_RED='#5b1018';
const DARK_RED_BORDER='#8f2632';
let places=[];
const isPlace=p=>p&&Number.isFinite(Number(p.center_lat))&&Number.isFinite(Number(p.center_lng));
async function loadPlaces(){
  try{
    const q=await db.from('game_places').select('id,name,kind,center_lat,center_lng').limit(5000);
    if(q.error)throw q.error;
    places=(q.data||[]).filter(isPlace);
    paint();
  }catch(e){console.debug('MAFIVERA place overlay:',e.message||e)}
}
function sameCell(a,b){return Math.floor(Number(a.lat)/.0018)===Math.floor(Number(b.lat)/.0018)&&Math.floor(Number(a.lng)/.0025)===Math.floor(Number(b.lng)/.0025)}
function paint(){
  const m=window.__mtrwMap;
  if(!m||!Array.isArray(window.__mtrwGridRects))return;
  window.__mtrwGridRects.forEach(rect=>{
    const c=rect.getBounds().getCenter();
    const hit=places.some(p=>sameCell(c,{lat:p.center_lat,lng:p.center_lng}));
    if(!hit)return;
    rect.setStyle({color:DARK_RED_BORDER,fillColor:DARK_RED,weight:2,fillOpacity:.38});
  });
}
function hook(){
  const m=window.__mtrwMap;
  if(!m)return setTimeout(hook,500);
  loadPlaces();
  setInterval(loadPlaces,30000);
}
hook();
})();
