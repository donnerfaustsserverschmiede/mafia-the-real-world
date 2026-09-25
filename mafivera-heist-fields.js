/* MAFIVERA — Heist-Ziel-Analyse
   Reine Darstellungsebene:
   - ermittelt Läden, Banken und ähnliche OSM-Ziele
   - färbt betroffene Spielfelder dunkelrot
   - ersetzt dort das Ressourcensymbol durch 💀
   - verändert keine Territory-/Gebäude-/Spielmechanik
*/
(()=>{'use strict';
if(window.__mtrwHeistFieldEngine)return;
window.__mtrwHeistFieldEngine=true;

const GLAT=.0018,GLNG=.0025;
const OVERPASS='https://overpass-api.de/api/interpreter';
const cache=new Map();
const allCounts=new Map();
const rendered=new Map();
const tileLayers=new Map();
let map=null,overlay=null,skullLayer=null,lastQueryKey='',busy=false,pending=false;

window.__mtrwHeistZones=new Set();

const tileKey=(r,c)=>'z_'+r+'_'+c;
const cell=(lat,lng)=>({r:Math.floor(lat/GLAT),c:Math.floor(lng/GLNG)});
const center=(r,c)=>[(r+.5)*GLAT,(c+.5)*GLNG];
const tileBounds=(r,c)=>[[r*GLAT,c*GLNG],[(r+1)*GLAT,(c+1)*GLNG)];

function css(){
 if(document.getElementById('mtrwHeistFieldCSS'))return;
 const s=document.createElement('style');
 s.id='mtrwHeistFieldCSS';
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
 const q=`[out:json][timeout:25];(
 nwr["shop"](${south},${west},${north},${east});
 nwr["amenity"~"bank|casino|fuel|pharmacy|post_office|money_transfer"](${south},${west},${north},${east});
 nwr["office"~"bank|insurance"](${south},${west},${north},${east});
);out center tags;`;
 const res=await fetch(OVERPASS,{method:'POST',body:'data='+encodeURIComponent(q),headers:{'Accept':'application/json','Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'}});
 if(!res.ok)throw Error('Overpass HTTP '+res.status);
 return(await res.json()).elements||[];
}

function colorFor(count){
 const n=Math.min(Math.max(Number(count)||1,1),8);
 const red=Math.max(48,132-(n-1)*12);
 const green=Math.max(7,28-(n-1)*3);
 const blue=Math.max(9,32-(n-1)*3);
 return {fill:`rgb(${red},${green},${blue})`,border:`rgb(${Math.max(100,red+15)},${Math.max(15,green)},${Math.max(18,blue)})`,opacity:Math.min(.82,.52+(n-1)*.045)};
}

function addTile(k,count){
 if(!map||!overlay||rendered.get(k)===count)return;
 const m=/^z_(-?\d+)_(-?\d+)$/.exec(k);
 if(!m)return;
 const r=Number(m[1]),c=Number(m[2]);
 const col=colorFor(count);

 const oldRect=tileLayers.get(k);
 const oldSkull=tileLayers.get(k+'#skull');
 if(oldRect){try{overlay.removeLayer(oldRect)}catch(_){}}
 if(oldSkull){try{skullLayer.removeLayer(oldSkull)}catch(_){}}

 const rect=L.rectangle(tileBounds(r,c),{
   color:col.border,weight:1,fillColor:col.fill,fillOpacity:col.opacity,interactive:false,className:'mtrw-heist-field'
 }).addTo(overlay);
 const[lat,lng]=center(r,c);
 const marker=L.marker([lat,lng],{interactive:false,zIndexOffset:1100,icon:L.divIcon({
   className:'mtrw-heist-skull',html:'<span>💀</span>',iconSize:[38,38],iconAnchor:[19,19]
 })}).addTo(skullLayer);

 tileLayers.set(k,rect);
 tileLayers.set(k+'#skull',marker);
 rendered.set(k,count);
}
function redraw(){
 if(!map||!overlay)return;
 for(const[k,count]of allCounts)addTile(k,count);
 window.__mtrwHeistZones=new Set(allCounts.keys());
 window.mtrwRefreshResourceMarkers?.();
}

function mergeCounts(counts){
 for(const[k,count]of Object.entries(counts)){
   const n=Number(count)||0;
   if(n>0)allCounts.set(k,Math.max(allCounts.get(k)||0,n));
 }
}

async function refresh(force=false){
 if(!map)return;
 const b=map.getBounds();
 const south=b.getSouth(),west=b.getWest(),north=b.getNorth(),east=b.getEast();
 const step=.05;
 const key=[Math.floor(south/step),Math.floor(west/step),Math.floor(north/step),Math.floor(east/step)].join(':');

 if(busy){pending=true;return;}
 if(!force&&key===lastQueryKey)return;

 busy=true;
 try{
   lastQueryKey=key;
   let counts=cache.get(key);
   if(!counts){
     const elements=await query(north,south,east,west);
     counts={};
     for(const el of elements){
       const p=targetPoint(el);
       if(!p||!Number.isFinite(p[0])||!Number.isFinite(p[1]))continue;
       const q=cell(p[0],p[1]),k=tileKey(q.r,q.c);
       counts[k]=(counts[k]||0)+1;
     }
     cache.set(key,counts);
     mergeCounts(counts);
   }
   redraw();
 }catch(e){
   console.warn('MAFIVERA Heist-Ziele:',e);
 }finally{
   busy=false;
   if(pending){
     pending=false;
     const now=map?.getBounds();
     if(now){
       const nk=[Math.floor(now.getSouth()/.05),Math.floor(now.getWest()/.05),Math.floor(now.getNorth()/.05),Math.floor(now.getEast()/.05)].join(':');
       if(nk!==lastQueryKey)refresh(false);
     }
   }
 }
}

function boot(){
 map=window.__mtrwMap;
 if(!map||typeof L==='undefined')return;
 css();
 overlay=L.layerGroup().addTo(map);
 skullLayer=L.layerGroup().addTo(map);

 const legend=document.createElement('div');
 legend.className='mtrw-heist-legend';
 legend.innerHTML='💀 Heist-Ziel · <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener" style="color:#ddd;text-decoration:none">© OpenStreetMap</a>';
 const host=document.querySelector('.mf-map');
 if(host&&!host.querySelector('.mtrw-heist-legend'))host.appendChild(legend);

 refresh(true);
 map.on('moveend',()=>refresh(false));
 map.on('zoomend',()=>refresh(false));
 window.mtrwRefreshHeistFields=()=>refresh(true);
}

const wait=setInterval(()=>{if(window.__mtrwMap){clearInterval(wait);boot()}},250);
setTimeout(()=>clearInterval(wait),30000);
})();