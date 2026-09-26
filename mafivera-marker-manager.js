/* MAFIVERA V2 — official resource marker layer
   Exactly ONE resource icon per map tile.
   Resource type is calculated with the SAME deterministic rule as the map tiles.
   If a stored world_territories resource exists, that value is used first.
*/
(()=>{'use strict';
if(window.__mtrwResourceMarkerEngine)return;
window.__mtrwResourceMarkerEngine=true;
const GLAT=.0018,GLNG=.0025,R=5;
let map=null,layer=null,lastKey='';

const icon=x=>x==='money'?'$':x==='material'?'◆':x==='reputation'?'★':'⚙';
const baseResourceForTile=(r,c)=>{
  const h=Math.abs(r*73856093+c*19349663)%100;
  return h<5?'weapon_parts':h<45?'money':h<80?'material':'reputation';
};
const tileKey=(r,c)=>'z_'+r+'_'+c;

function style(){
  if(document.getElementById('mtrwResourceMarkerCSS'))return;
  const s=document.createElement('style');
  s.id='mtrwResourceMarkerCSS';
  s.textContent=`
.building-marker,.mtrw-stable-building-marker{display:none!important;visibility:hidden!important;pointer-events:none!important}
.mtrw-resource-marker{
  background:transparent!important;
  border:0!important;
  width:34px!important;
  height:34px!important;
  pointer-events:none!important;
  z-index:1000!important;
}
.mtrw-resource-marker span{
  display:flex;
  align-items:center;
  justify-content:center;
  width:28px;
  height:28px;
  margin:3px;
  border-radius:50%;
  background:#10151de8;
  border:2px solid currentColor;
  box-shadow:0 2px 7px #000b,0 0 8px currentColor;
  box-sizing:border-box;
  font:900 15px/24px system-ui,sans-serif;
  text-shadow:0 1px 3px #000;
}
.mtrw-resource-marker .money{color:#f0c34c}
.mtrw-resource-marker .material{color:#52dfb0}
.mtrw-resource-marker .reputation{color:#e9b8ff}
.mtrw-resource-marker .weapon_parts{color:#ff9f43}
`;
  document.head.appendChild(s);
}

function render(){
  if(!map||!layer)return;
  const center=map.getCenter();
  const r0=Math.floor(center.lat/GLAT),c0=Math.floor(center.lng/GLNG);
  const key=`${r0}:${c0}:${map.getZoom()}`;
  if(key===lastKey)return;
  lastKey=key;
  layer.clearLayers();

  const visible=[];
  for(let r=r0-R;r<=r0+R;r++)for(let c=c0-R;c<=c0+R;c++)visible.push({r,c});

  const world=window.__mtrwWorld||{};
  for(const q of visible){
    const lat=(q.r+.5)*GLAT,lng=(q.c+.5)*GLNG;
    const stored=world[tileKey(q.r,q.c)];
    const k=tileKey(q.r,q.c); if(window.__mtrwHeistZones?.has(k)) continue; const p=stored?.resources?.[0]||baseResourceForTile(q.r,q.c);
    L.marker([lat,lng],{
      interactive:false,
      zIndexOffset:1000,
      icon:L.divIcon({
        className:'mtrw-resource-marker',
        html:'<span class="'+p+'">'+icon(p)+'</span>',
        iconSize:[34,34],
        iconAnchor:[17,17]
      })
    }).addTo(layer);
  }
}
function refresh(){lastKey='';render()}
window.mtrwRefreshResourceMarkers=refresh;

function boot(){
  map=window.__mtrwMap;
  if(!map||typeof L==='undefined')return;
  style();
  layer=L.layerGroup().addTo(map);
  render();
  map.on('moveend',render);
  map.on('zoomend',()=>{lastKey='';render()});
  window.addEventListener('mtrw:resources-updated',refresh);
}
const wait=setInterval(()=>{if(window.__mtrwMap){clearInterval(wait);boot()}},250);
setTimeout(()=>clearInterval(wait),30000);
})();