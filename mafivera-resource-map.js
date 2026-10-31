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
 {id:'cannabis',label:'Cannabis',color:'#35c96b',chance:0.34,building:'field'},
 {id:'flour',label:'Mehl',color:'#eee8d5',chance:0.28,building:'mill'},
 {id:'weapon_parts',label:'Waffenteile',color:'#929eae',chance:0.22,building:'workshop'},
 {id:'coca',label:'Koka',color:'#e5c12d',chance:0.3,building:'field'},
 {id:'meth',label:'Meth',color:'#b36be8',chance:0.2,building:'lab'},
 {id:'chemicals',label:'Chemikalien',color:'#26b9d1',chance:0.26,building:'lab'},
 {id:'tobacco',label:'Tabak',color:'#b78343',chance:0.32,building:'field'},
 {id:'metals',label:'Metalle',color:'#dc873b',chance:0.36,building:'workshop'}
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
 const radius=430+rand(key,'radius')*620;
 const peak=Math.round(48+rand(key,'peak')*52);
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
let map=null,canvas=null,ctx=null,legend=null,drawnKey='';
function render(){
 if(!map||!canvas||!ctx)return;
 const zoom=map.getZoom(),size=map.getSize(),bounds=map.getBounds();
 const topLeft=map.containerPointToLayerPoint([0,0]);
 const key=[zoom,size.x,size.y,bounds.getSouthWest().lat.toFixed(5),bounds.getSouthWest().lng.toFixed(5),bounds.getNorthEast().lat.toFixed(5),bounds.getNorthEast().lng.toFixed(5)].join('|');
 if(key===drawnKey)return;
 drawnKey=key;
 const ratio=Math.max(1,window.devicePixelRatio||1);
 canvas.width=Math.round(size.x*ratio);canvas.height=Math.round(size.y*ratio);
 canvas.style.width=size.x+'px';canvas.style.height=size.y+'px';
 L.DomUtil.setPosition(canvas,topLeft);
 ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,size.x,size.y);
 if(zoom<11)return;
 ctx.globalCompositeOperation='screen';
 for(const p of patchesIn(bounds)){
  const res=RESOURCES.find(x=>x.id===p.resource);
  const layerPoint=map.latLngToLayerPoint([p.lat,p.lng]);
  const x=layerPoint.x-topLeft.x,y=layerPoint.y-topLeft.y;
  const edge=map.latLngToLayerPoint([p.lat+p.radius/111320,p.lng]);
  const radius=Math.max(2,Math.abs(layerPoint.y-edge.y));
  const strength=p.peak/100;
  const gradient=ctx.createRadialGradient(x,y,0,x,y,radius);
  gradient.addColorStop(0,'rgba('+hexRgb(res.color)+','+(0.66+strength*.30)+')');
  gradient.addColorStop(.28,'rgba('+hexRgb(res.color)+','+(0.48+strength*.32)+')');
  gradient.addColorStop(.68,'rgba('+hexRgb(res.color)+','+(0.20+strength*.20)+')');
  gradient.addColorStop(1,'rgba('+hexRgb(res.color)+',0)');
  ctx.fillStyle=gradient;ctx.beginPath();ctx.arc(x,y,radius,0,Math.PI*2);ctx.fill();
 }
 ctx.globalCompositeOperation='source-over';
}
function hexRgb(hex){const n=parseInt(hex.slice(1),16);return [(n>>16)&255,(n>>8)&255,n&255].join(',')}
function popup(lat,lng){
 const values=scan(lat,lng);
 const rows=values.map(v=>'<div class="mf-resource-popup-row"><span><i style="--resource-color:'+v.color+'"></i>'+v.label+'</span><b>'+v.concentration+'%</b></div>').join('');
 L.popup({className:'mafivera-resource-popup',maxWidth:240,minWidth:210,autoPan:true})
  .setLatLng([lat,lng])
  .setContent('<section class="mf-resource-popup-card"><strong>Ressourcen-Scan</strong>'+rows+'</section>')
  .openOn(map);
}
function buildLegend(){
 if(legend)return;
 legend=document.createElement('aside');legend.className='mafivera-resource-legend';
 legend.innerHTML='<div class="mafivera-legend-title">RESSOURCEN</div>'+RESOURCES.map(r=>'<div class="mafivera-legend-row"><span class="mafivera-legend-dot" style="--resource-color:'+r.color+'"></span><span>'+r.label+'</span></div>').join('');
 map.getContainer().appendChild(legend);
}
function init(){
 if(map||!window.__mtrwMap||!window.L)return false;
 map=window.__mtrwMap;map.getContainer().style.background='#101820';canvas=document.createElement('canvas');canvas.className='mafivera-resource-heatmap';canvas.style.cssText='position:absolute;left:0;top:0;pointer-events:none;z-index:450';ctx=canvas.getContext('2d',{alpha:true});if(!ctx)return false;map.getPanes().overlayPane.appendChild(canvas);
 map.on('move moveend zoom zoomend viewreset resize',()=>{drawnKey='';render()});
 map.on('click',e=>popup(e.latlng.lat,e.latlng.lng));
 buildLegend();render();
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
const style=document.createElement('style');style.id='mafivera-resource-legend-style';style.textContent=`
.mf-map,.leaflet-container{background:#101820!important}
.mf-map .leaflet-shadow-pane,.mf-map .leaflet-tooltip-pane{display:none!important}
.mafivera-resource-heatmap{z-index:450!important}
.mafivera-resource-legend{position:absolute!important;z-index:650!important;top:12px!important;left:12px!important;right:auto!important;width:136px!important;min-width:136px!important;max-width:136px!important;box-sizing:border-box!important;padding:8px 9px!important;background:rgba(10,16,23,.94)!important;border:1px solid rgba(255,255,255,.16)!important;border-radius:10px!important;box-shadow:0 6px 22px rgba(0,0,0,.4)!important;color:#f4f6f8!important;font:11px/1.25 system-ui,sans-serif!important;pointer-events:none!important;backdrop-filter:blur(8px)!important}
.mafivera-legend-title{display:block!important;font:800 9px/1.2 system-ui,sans-serif!important;letter-spacing:.12em!important;color:#cbd5df!important;margin:0 0 7px!important;white-space:nowrap!important}
.mafivera-legend-row{display:flex!important;align-items:center!important;gap:7px!important;padding:4px 0!important;white-space:nowrap!important;font:11px/1.2 system-ui,sans-serif!important;color:#f4f6f8!important}
.mafivera-legend-dot{display:inline-block!important;width:9px!important;height:9px!important;min-width:9px!important;max-width:9px!important;border-radius:50%!important;background:var(--resource-color)!important;box-shadow:0 0 8px var(--resource-color)!important;flex:0 0 9px!important}
.mafivera-resource-popup .leaflet-popup-content-wrapper{width:250px!important;max-width:calc(100vw - 40px)!important;background:#111923!important;color:#f3f4f6!important;border-radius:10px!important}
.mafivera-resource-popup .leaflet-popup-content{width:220px!important;max-width:calc(100vw - 64px)!important;margin:10px 12px!important;font:13px/1.35 system-ui,sans-serif!important;color:#f3f4f6!important}
.mf-resource-popup-card{display:block!important;width:100%!important;min-width:0!important;max-width:100%!important;box-sizing:border-box!important;background:#111923!important;color:#f3f4f6!important;font:13px/1.35 system-ui,sans-serif!important}
.mf-resource-popup-card strong{display:block!important;font:700 14px/1.3 system-ui,sans-serif!important;margin:0 0 7px!important;color:#fff!important}
.mf-resource-popup-row{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:10px!important;padding:5px 0!important;border-bottom:1px solid #ffffff18!important;font:13px/1.3 system-ui,sans-serif!important;color:#f3f4f6!important;white-space:nowrap!important}
.mf-resource-popup-row span{display:flex!important;align-items:center!important;gap:7px!important;font:13px/1.3 system-ui,sans-serif!important;color:#f3f4f6!important}
.mf-resource-popup-row i{display:inline-block!important;width:8px!important;height:8px!important;min-width:8px!important;border-radius:50%!important;background:var(--resource-color)!important}
.mf-resource-popup-row b{font:700 13px/1.3 system-ui,sans-serif!important;color:#fff!important}
`;
})();
