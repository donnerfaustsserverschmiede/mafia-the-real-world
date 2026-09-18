/* MAFIVERA – Real-world place field overlay */
(()=>{'use strict';
if(window.__mtrwPlaceOverlay)return;window.__mtrwPlaceOverlay=true;
const DARK_RED='#5b1018',DARK_RED_BORDER='#8f2632';
let places=[],loading=false;
function sameCell(a,b){return Math.floor(Number(a.lat)/.0018)===Math.floor(Number(b.lat)/.0018)&&Math.floor(Number(a.lng)/.0025)===Math.floor(Number(b.lng)/.0025)}
async function loadPlaces(){
 const m=window.__mtrwMap;if(!m||loading)return; loading=true;
 try{
  const b=m.getBounds(),south=b.getSouth(),west=b.getWest(),north=b.getNorth(),east=b.getEast();
  const q='[out:json][timeout:12];(nwr[shop]('+south+','+west+','+north+','+east+');nwr[amenity~"^(bank|atm|pharmacy|restaurant|cafe|bar|pub|fuel|fast_food|post_office|cinema|theatre|hospital|clinic|police|fire_station)$"]('+south+','+west+','+north+','+east+'););out center;';
  const r=await fetch('https://overpass-api.de/api/interpreter?data='+encodeURIComponent(q));
  if(!r.ok)throw Error('Overpass '+r.status);
  const d=await r.json();
  places=(d.elements||[]).map(x=>({lat:x.lat??x.center?.lat,lng:x.lon??x.center?.lon})).filter(x=>Number.isFinite(x.lat)&&Number.isFinite(x.lng));
  paint();
 }catch(e){console.debug('MAFIVERA place overlay:',e.message||e)}finally{loading=false}
}
function paint(){
 const m=window.__mtrwMap,rects=window.__mtrwGridRects;
 if(!m||!Array.isArray(rects))return;
 rects.forEach(rect=>{const c=rect.getBounds().getCenter();if(places.some(p=>sameCell(c,p)))rect.setStyle({color:DARK_RED_BORDER,fillColor:DARK_RED,weight:2,fillOpacity:.42});});
}
function hook(){const m=window.__mtrwMap;if(!m)return setTimeout(hook,500);loadPlaces();m.on('moveend',loadPlaces);setInterval(loadPlaces,60000)}
hook();
})();
