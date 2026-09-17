/* MAFIVERA – hard marker renderer
   Independent fallback for the map's resource/building markers.
   It does not replace territory rendering; it only restores the visible markers. */
(()=>{'use strict';
const GLAT=.0018,GLNG=.0025,R=5;
let layer=null,busy=false,lastCenter='';
const esc=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
const resource=(r,c)=>{const h=Math.abs((r*73856093)^(c*19349663))%6;return h===0?['money','material']:h===1?['material','reputation']:h===2?['money','reputation']:h===3?['material','money']:h===4?['reputation','money']:['material','reputation']};
const icon=x=>x==='money'?'$':x==='material'?'▣':'★';
const name=x=>x==='money'?'Geld':x==='material'?'Material':'Reputation';
const center=(r,c)=>[(r+.5)*GLAT,(c+.5)*GLNG];
const cell=(lat,lng)=>({r:Math.floor(lat/GLAT),c:Math.floor(lng/GLNG)});
function draw(){
 const map=window.__mtrwMap;
 if(!map||!window.L||busy)return;
 const bc=cell(map.getCenter().lat,map.getCenter().lng),key=bc.r+':'+bc.c;
 if(key===lastCenter && layer)return;
 busy=true;lastCenter=key;
 if(layer)layer.remove();
 layer=L.layerGroup().addTo(map);
 for(let r=bc.r-R;r<=bc.r+R;r++)for(let c=bc.c-R;c<=bc.c+R;c++){
   const [lat,lng]=center(r,c);
   resource(r,c).forEach((p,i)=>{
     const pos=[lat+(i===0?-.00025:.00025),lng+(i===0?-.00032:.00032)];
     L.marker(pos,{interactive:false,zIndexOffset:900,icon:L.divIcon({className:'mtrw-hard-resource',html:`<span class="${p}" title="${name(p)}">${icon(p)}</span>`,iconSize:[30,30],iconAnchor:[15,15]})}).addTo(layer);
   });
 }
 // Buildings are loaded separately so a failed world query cannot stop resource markers.
 (async()=>{try{
   if(window.db){const q=await window.db.from('world_territories').select('zone_key,building_type,building_level,building_finish_at');
    (q.data||[]).forEach(t=>{const m=/^z_(-?\\d+)_(-?\\d+)$/.exec(t.zone_key||'');if(!m||!t.building_type)return;const r=+m[1],c=+m[2];if(Math.abs(r-bc.r)>R||Math.abs(c-bc.c)>R)return;const [lat,lng]=center(r,c);const labels={warehouse:['📦','Lager'],money:['💵','Geldwäsche'],club:['🥃','Clubhaus'],lab:['⚗️','Chemielabor'],market:['🕶️','Schwarzmarkt'],watch:['🛡️','Wachposten'],hideout:['🏚️','Gangversteck'],recruitment:['👤','Rekrutierungszentrum']};const b=labels[t.building_type]||['🏗️',t.building_type];L.marker([lat,lng],{interactive:false,zIndexOffset:1000,icon:L.divIcon({className:'mtrw-hard-building',html:`<span>${b[0]}</span><b>${esc(b[1])} · St. ${t.building_level||1}</b>`,iconSize:[110,52],iconAnchor:[55,26]})}).addTo(layer)});
   }
 }catch(e){} finally{busy=false}})();
}
function style(){if(document.getElementById('mtrw-hard-marker-style'))return;const s=document.createElement('style');s.id='mtrw-hard-marker-style';s.textContent=`
.mtrw-hard-resource,.mtrw-hard-building{background:transparent!important;border:0!important;overflow:visible!important;text-align:center!important;pointer-events:none!important}
.mtrw-hard-resource{width:30px!important;height:30px!important;display:grid!important;place-items:center!important}
.mtrw-hard-resource span{width:27px!important;height:27px!important;display:grid!important;place-items:center!important;border:1px solid #394653!important;border-radius:7px!important;background:#10151deb!important;font:900 15px/27px system-ui,sans-serif!important;text-shadow:0 1px 2px #000!important;box-sizing:border-box!important}
.mtrw-hard-resource .money{color:#f0c34c!important}.mtrw-hard-resource .material{color:#52dfb0!important}.mtrw-hard-resource .reputation{color:#e9b8ff!important}
.mtrw-hard-building{width:110px!important;height:52px!important;display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important}
.mtrw-hard-building span{font-size:27px!important;line-height:28px!important}.mtrw-hard-building b{font:700 8px/12px system-ui,sans-serif!important;color:#fff!important;background:#10151de8!important;border-radius:5px!important;padding:1px 5px!important;white-space:nowrap!important}
`;document.head.appendChild(s)}
function boot(){style();let n=0;const t=setInterval(()=>{if(window.__mtrwMap){draw();if(++n>30)clearInterval(t)}},500);setTimeout(()=>{const m=window.__mtrwMap;if(m)m.on('moveend zoomend',()=>{lastCenter='';draw()})},2000)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();