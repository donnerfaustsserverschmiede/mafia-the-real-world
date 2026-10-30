/* MAFIVERA — global deterministic resource overlay (map rebuild foundation)
 * Resource patches are generated from fixed world coordinates, never from the
 * player's current GPS position. Values are stable across visits and devices
 * for this seed. Server-authoritative persistence will replace the client seed
 * before production economy/building interactions are enabled.
 */
(()=>{'use strict';
if(window.__MAFIVERA_RESOURCE_OVERLAY__)return;
window.__MAFIVERA_RESOURCE_OVERLAY__=true;

const WORLD_SEED='MAFIVERA-GLOBAL-WORLD-V1';
const BUCKET_LAT=.018;
const BUCKET_LNG=.024;
const RESOURCES=[
 {id:'cannabis',label:'Cannabis',color:'#35c96b',chance:.12,building:'field'},
 {id:'flour',label:'Mehl',color:'#eee8d5',chance:.10,building:'mill'},
 {id:'weapon_parts',label:'Waffenteile',color:'#929eae',chance:.07,building:'workshop'},
 {id:'coca',label:'Koka',color:'#e5c12d',chance:.09,building:'field'},
 {id:'meth',label:'Meth',color:'#b36be8',chance:.055,building:'lab'},
 {id:'chemicals',label:'Chemikalien',color:'#26b9d1',chance:.08,building:'lab'},
 {id:'tobacco',label:'Tabak',color:'#b78343',chance:.11,building:'field'},
 {id:'metals',label:'Metalle',color:'#dc873b',chance:.13,building:'workshop'}
];
const clamp=n=>Math.max(0,Math.min(100,Number(n)||0));
const hash=s=>{let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0};
const rand=(key,salt)=>hash(WORLD_SEED+'|'+key+'|'+salt)/4294967296;
const distance=(a,b)=>{const rad=Math.PI/180,dLat=(b.lat-a.lat)*rad,dLng=(b.lng-a.lng)*rad,x=Math.sin(dLat/2)**2+Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.sin(dLng/2)**2;return 6371000*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x))};
const patchKey=(r,c,id)=>r+':'+c+':'+id;
function makePatch(r,c,res){
 const key=patchKey(r,c,res.id);
 if(rand(key,'spawn')>res.chance)return null;
 const lat=(r+rand(key,'lat'))*BUCKET_LAT;
 const lng=(c+rand(key,'lng'))*BUCKET_LNG;
 const radius=85+rand(key,'radius')*190;
 const peak=Math.round(24+rand(key,'peak')*76);
 return {id:key,resource:res.id,lat,lng,radius,peak};
}
function patchesIn(bounds){
 const sw=bounds.getSouthWest(),ne=bounds.getNorthEast();
 const r0=Math.floor(sw.lat/BUCKET_LAT)-1,r1=Math.floor(ne.lat/BUCKET_LAT)+1;
 const c0=Math.floor(sw.lng/BUCKET_LNG)-1,c1=Math.floor(ne.lng/BUCKET_LNG)+1;
 const out=[];
 for(let r=r0;r<=r1;r++)for(let c=c0;c<=c1;c++)for(const res of RESOURCES){
  const p=makePatch(r,c,res);if(p)out.push(p);
 }
 return out;
}
function concentrationAt(lat,lng,patch){
 const d=distance({lat,lng},patch);
 if(d>=patch.radius)return 0;
 const falloff=1-d/patch.radius;
 return clamp(Math.round(patch.peak*falloff*falloff));
}
function scan(lat,lng){
 const cellR=Math.floor(lat/BUCKET_LAT),cellC=Math.floor(lng/BUCKET_LNG);
 const found={};
 for(let r=cellR-1;r<=cellR+1;r++)for(let c=cellC-1;c<=cellC+1;c++)for(const res of RESOURCES){
  const p=makePatch(r,c,res);if(!p)continue;
  const value=concentrationAt(lat,lng,p);
  if(value>0)found[res.id]=Math.max(found[res.id]||0,value);
 }
 return RESOURCES.map(r=>({id:r.id,label:r.label,color:r.color,concentration:found[r.id]||0}));
}
let map=null,layer=null,drawnKey='';
function render(){
 if(!map||!layer)return;
 const zoom=map.getZoom();
 const bounds=map.getBounds();
 const key=[zoom,bounds.getSouthWest().lat.toFixed(3),bounds.getSouthWest().lng.toFixed(3),bounds.getNorthEast().lat.toFixed(3),bounds.getNorthEast().lng.toFixed(3)].join('|');
 if(key===drawnKey)return;
 drawnKey=key;layer.clearLayers();
 if(zoom<13)return;
 for(const p of patchesIn(bounds)){
  const res=RESOURCES.find(x=>x.id===p.resource);
  const opacity=.08+(p.peak/100)*.34;
  L.circle([p.lat,p.lng],{
   radius:p.radius,color:res.color,weight:1,opacity:.28+(p.peak/100)*.55,
   fillColor:res.color,fillOpacity:opacity,interactive:false,bubblingMouseEvents:false
  }).addTo(layer);
 }
}
function popup(lat,lng){
 const values=scan(lat,lng);
 const rows=values.map(v=>'<div style="display:flex;align-items:center;justify-content:space-between;gap:18px;padding:5px 0;border-bottom:1px solid #ffffff18"><span><i style="display:inline-block;width:9px;height:9px;border-radius:50%;background:'+v.color+';margin-right:8px"></i>'+v.label+'</span><b style="font-variant-numeric:tabular-nums">'+v.concentration+'%</b></div>').join('');
 L.popup({maxWidth:280}).setLatLng([lat,lng]).setContent('<section style="min-width:210px;color:#f3f4f6;background:#111923;padding:5px 7px;border-radius:9px"><strong style="display:block;margin-bottom:7px">Ressourcen-Scan</strong>'+rows+'</section>').openOn(map);
}
function init(){
 if(map||!window.__mtrwMap||!window.L)return false;
 map=window.__mtrwMap;layer=L.layerGroup().addTo(map);
 map.on('moveend zoomend',()=>{drawnKey='';render()});
 map.on('click',e=>popup(e.latlng.lat,e.latlng.lng));
 render();
 window.mtrwRefreshResourceMap=()=>{drawnKey='';render()};
 window.MAFIVERA_RESOURCE_MAP=Object.freeze({
  version:2,resources:RESOURCES.map(x=>({...x})),scan,
  rules:Object.freeze({globalCoordinates:true,deterministic:true,overlappingResources:true,zeroIsTransparent:true,concentrationFromPatchCenter:true,playerPositionDoesNotSeedWorld:true,serverAuthoritative:false})
 });
 window.dispatchEvent(new CustomEvent('mtrw:resource-map-ready'));
 return true;
}
let tries=0;
const wait=setInterval(()=>{if(init()||++tries>=120)clearInterval(wait)},250);
})();
