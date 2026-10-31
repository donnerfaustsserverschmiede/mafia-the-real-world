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
let map=null,canvas=null,ctx=null,legend=null,drawnKey='';
function render(){
 if(!map||!canvas||!ctx)return;
 const zoom=map.getZoom(),size=map.getSize();
 const bounds=map.getBounds();
 const key=[zoom,size.x,size.y,bounds.getSouthWest().lat.toFixed(4),bounds.getSouthWest().lng.toFixed(4),bounds.getNorthEast().lat.toFixed(4),bounds.getNorthEast().lng.toFixed(4)].join('|');
 if(key===drawnKey)return;
 drawnKey=key;
 const ratio=Math.max(1,window.devicePixelRatio||1);
 canvas.width=Math.round(size.x*ratio);canvas.height=Math.round(size.y*ratio);
 canvas.style.width=size.x+'px';canvas.style.height=size.y+'px';
 ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,size.x,size.y);
 if(zoom<11)return;
 ctx.globalCompositeOperation='screen';
 for(const p of patchesIn(bounds)){
  const res=RESOURCES.find(x=>x.id===p.resource);
  const point=map.latLngToContainerPoint([p.lat,p.lng]);
  const edge=map.latLngToContainerPoint([p.lat+p.radius/111320,p.lng]);
  const radius=Math.max(2,Math.abs(point.y-edge.y));
  const strength=p.peak/100;
  const gradient=ctx.createRadialGradient(point.x,point.y,0,point.x,point.y,radius);
  gradient.addColorStop(0,'rgba('+hexRgb(res.color)+','+(0.24+strength*.34)+')');
  gradient.addColorStop(.28,'rgba('+hexRgb(res.color)+','+(0.16+strength*.2)+')');
  gradient.addColorStop(.68,'rgba('+hexRgb(res.color)+','+(0.055+strength*.08)+')');
  gradient.addColorStop(1,'rgba('+hexRgb(res.color)+',0)');
  ctx.fillStyle=gradient;ctx.beginPath();ctx.arc(point.x,point.y,radius,0,Math.PI*2);ctx.fill();
 }
 ctx.globalCompositeOperation='source-over';
}
function hexRgb(hex){const n=parseInt(hex.slice(1),16);return [(n>>16)&255,(n>>8)&255,n&255].join(',')}
function popup(lat,lng){
 const values=scan(lat,lng);
 const rows=values.map(v=>'<div style="display:flex;align-items:center;justify-content:space-between;gap:18px;padding:5px 0;border-bottom:1px solid #ffffff18"><span><i style="display:inline-block;width:9px;height:9px;border-radius:50%;background:'+v.color+';margin-right:8px"></i>'+v.label+'</span><b style="font-variant-numeric:tabular-nums">'+v.concentration+'%</b></div>').join('');
 L.popup({maxWidth:280}).setLatLng([lat,lng]).setContent('<section style="min-width:210px;color:#f3f4f6;background:#111923;padding:5px 7px;border-radius:9px"><strong style="display:block;margin-bottom:7px">Ressourcen-Scan</strong>'+rows+'</section>').openOn(map);
}
function buildLegend(){
 if(legend)return;
 legend=document.createElement('aside');legend.className='mafivera-resource-legend';
 legend.innerHTML='<div class="mafivera-legend-title">RESSOURCEN</div>'+RESOURCES.map(r=>'<div class="mafivera-legend-row"><span class="mafivera-legend-dot" style="--resource-color:'+r.color+'"></span><span>'+r.label+'</span></div>').join('');
 map.getContainer().appendChild(legend);
}
function init(){
 if(map||!window.__mtrwMap||!window.L)return false;
 map=window.__mtrwMap;map.getContainer().style.background='#101820';canvas=document.createElement('canvas');canvas.className='mafivera-resource-heatmap';canvas.style.cssText='position:absolute;left:0;top:0;pointer-events:none;z-index:450';ctx=canvas.getContext('2d',{alpha:true});if(!ctx)return false;map.getContainer().appendChild(canvas);
 map.on('moveend zoomend resize',()=>{drawnKey='';render()});
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
.mf-map .leaflet-shadow-pane,.mf-map .leaflet-marker-pane,.mf-map .leaflet-tooltip-pane{display:none!important}
.mafivera-resource-heatmap{z-index:450!important}
.mafivera-resource-legend{position:absolute;z-index:650;top:12px;right:12px;min-width:0;max-width:160px;padding:9px 11px;background:rgba(10,16,23,.94);border:1px solid rgba(255,255,255,.16);border-radius:10px;box-shadow:0 6px 22px rgba(0,0,0,.4);color:#f4f6f8;font:11px/1.3 system-ui,sans-serif;pointer-events:none;backdrop-filter:blur(8px)}
.mafivera-legend-title{font-size:10px;font-weight:800;letter-spacing:.13em;color:#cbd5df;margin-bottom:8px}
.mafivera-legend-row{display:flex;align-items:center;gap:7px;padding:3px 0;white-space:nowrap}
.mafivera-legend-dot{width:10px;height:10px;border-radius:50%;background:var(--resource-color);box-shadow:0 0 9px var(--resource-color);flex:0 0 10px}
`;document.head.appendChild(style);
})();
