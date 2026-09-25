/* MAFIVERA — Heist-Ziel-Analyse
   Uses OpenStreetMap/Overpass POIs to mark tiles containing shops, banks and similar targets.
   The game map remains the source of territory/resource data; OSM is only used for target detection.
*/
(()=>{'use strict';
if(window.__mtrwHeistFieldEngine)return;
window.__mtrwHeistFieldEngine=true;

const GLAT=.0018,GLNG=.0025,R=5;
const OVERPASS='https://overpass-api.de/api/interpreter';
const cache=new Map();
let map=null,overlay=null,skullLayer=null,lastQueryKey='',busy=false;
window.__mtrwHeistZones=new Set();

const tileKey=(r,c)=>'z_'+r+'_'+c;
const cell=(lat,lng)=>({r:Math.floor(lat/GLAT),c:Math.floor(lng/GLNG)});
const center=(r,c)=>[(r+.5)*GLAT,(c+.5)*GLNG];
const bounds=(r,c)=>[[r*GLAT,c*GLNG],[(r+1)*GLAT,(c+1)*GLNG)];

function css(){
 if(document.getElementById('mtrwHeistFieldCSS'))return;
 const s=document.createElement('style');s.id='mtrwHeistFieldCSS';
 s.textContent=`
 .mtrw-heist-skull{background:transparent!important;border:0!important;width:36px!important;height:36px!important;pointer-events:none!important}
 .mtrw-heist-skull span{display:flex;align-items:center;justify-content:center;width:30px;height:30px;margin:3px;border-radius:50%;background:#13070ae8;border:2px solid #ef4444;box-shadow:0 0 12px #ef4444aa,0 2px 7px #000;font:900 17px/26px system-ui,sans-serif}
 .mtrw-heist-legend{position:absolute;left:10px;bottom:10px;z-index:1200;background:#111827e8;color:#fff;border:1px solid #7f1d1d;border-radius:9px;padding:5px 8px;font:800 10px system-ui,sans-serif;pointer-events:none}
 `;
 document.head.appendChild(s);
}

function targetPoint(el){
 if(el.lat!=null&&el.lon!=null)return [Number(el.lat),Number(el.lon)];
 const c=el.center;
 if(c?.lat!=null&&c?.lon!=null)return [Number(c.lat),Number(c.lon)];
 return null;
}

async function query(north,south,east,west){
 const q=`[out:json][timeout:25];(
 nwr["shop"](${south},${west},${north},${east});
 nwr["amenity"~"bank|casino|fuel|pharmacy|post_office|money_transfer"](${south},${west},${north},${east});
 nwr["office"~"bank|insurance"](${south},${west},${north},${east});
);out center tags;`;
 const res=await fetch(OVERPASS,{method:'POST',body:'data='+encodeURIComponent(q),headers:{'Accept':'application/json','Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'}});
 if(!res.ok)throw Error('Overpass HTTP '+res.status);
 return (await res.json()).elements||[];
}

function draw(counts){
 if(!map||!overlay)return;
 overlay.clearLayers();skullLayer.clearLayers();
 window.__mtrwHeistZones=new Set(Object.keys(counts));
 const values=Object.values(counts);
 const max=Math.max(1,...values);
 for(const [k,count] of Object.entries(counts)){
   const m=/^z_(-?\\d+)_(-?\\d+)$/.exec(k);if(!m)continue;
   const r=Number(m[1]),c=Number(m[2]);
   const ratio=count/max;
   /* More targets = darker/deeper red. */
   const light=Math.round(38-24*ratio);
   const opacity=Math.min(.78,.36+.10*Math.min(count,5));
   L.rectangle(bounds(r,c),{
     color:`rgb(${Math.max(75,125-light)},18,24)`,
     weight:1,
     fillColor:`rgb(${Math.max(58,105-light)},8,15)`,
     fillOpacity:opacity,
     interactive:false,
     className:'mtrw-heist-field'
   }).addTo(overlay);
   const [lat,lng]=center(r,c);
   L.marker([lat,lng],{interactive:false,zIndexOffset:1100,icon:L.divIcon({
     className:'mtrw-heist-skull',
     html:'<span>💀</span>',iconSize:[36,36],iconAnchor:[18,18]
   })}).addTo(skullLayer);
 }
}

async function refresh(force=false){
 if(!map)return;
 const b=map.getBounds();
 const south=b.getSouth(),west=b.getWest(),north=b.getNorth(),east=b.getEast();
 /* Query a small padded viewport; cache by coarse area so panning does not hammer Overpass. */
 const step=.05;
 const key=[Math.floor(south/step),Math.floor(west/step),Math.floor(north/step),Math.floor(east/step)].join(':');
 if(!force&&key===lastQueryKey)return;
 lastQueryKey=key;
 if(busy)return;
 busy=true;
 try{
   let counts=cache.get(key);
   if(!counts){
     const elements=await query(north,south,east,west);
     counts={};
     for(const el of elements){
       const p=targetPoint(el);if(!p||!Number.isFinite(p[0])||!Number.isFinite(p[1]))continue;
       const q=cell(p[0],p[1]),k=tileKey(q.r,q.c);
       counts[k]=(counts[k]||0)+1;
     }
     cache.set(key,counts);
   }
   draw(counts);
 }catch(e){
   console.warn('MAFIVERA Heist-Ziele:',e);
 }finally{busy=false}
}
function boot(){
 map=window.__mtrwMap;if(!map||typeof L==='undefined')return;
 css();
 overlay=L.layerGroup().addTo(map);
 skullLayer=L.layerGroup().addTo(map);
 const legend=document.createElement('div');legend.className='mtrw-heist-legend';legend.textContent='💀 Heist-Ziel';
 const host=document.querySelector('.mf-map');if(host&&!host.querySelector('.mtrw-heist-legend'))host.appendChild(legend);
 refresh(true);
 map.on('moveend',()=>refresh(false));
 map.on('zoomend',()=>refresh(false));
 window.mtrwRefreshHeistFields=()=>refresh(true);
}
const wait=setInterval(()=>{if(window.__mtrwMap){clearInterval(wait);boot()}},250);
setTimeout(()=>clearInterval(wait),30000);
})();