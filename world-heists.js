/* MAFIVERA V1 — World Heist Areas + Dark Map */
(()=>{'use strict';
if(window.mtrwWorldHeistAreasInstalled)return;
window.mtrwWorldHeistAreasInstalled=true;

/* Sofortiges Ingame-Map-Theme: wirkt auch dann, wenn game.js bereits geladen ist. */
const style=document.createElement('style');
style.id='mtrw-dark-world-style';
style.textContent=`#worldMap,.world-map{background:#05070a!important}#worldMap .leaflet-tile-pane{filter:brightness(.30) contrast(1.18) saturate(.58)}#worldMap .leaflet-tile{background:#05070a}#worldMap .leaflet-overlay-pane svg{filter:drop-shadow(0 0 3px rgba(85,166,255,.16))}.leaflet-control-attribution{background:rgba(5,7,10,.72)!important;color:#777!important}.leaflet-control-attribution a{color:#8c96a5!important}`;
document.head.appendChild(style);

const nativeFetch=window.fetch.bind(window);
window.fetch=async(input,init)=>{
 const url=typeof input==='string'?input:(input?.url||'');
 if(!url.includes('overpass-api.de/api/interpreter')&&!url.includes('overpass.private.coffee/api/interpreter'))return nativeFetch(input,init);
 let requestInit=init;
 try{
  if(init?.body&&typeof init.body==='string'&&init.body.includes('data=')){
   const params=new URLSearchParams(init.body),q=decodeURIComponent(params.get('data')||'');
   const m=q.match(/nwr\["shop"\]\(([^)]+)\)/);
   if(m){const b=m[1];const nq=`[out:json][timeout:25];(nwr["shop"](${b});nwr["amenity"="bank"](${b});nwr["landuse"="industrial"](${b});nwr["industrial"](${b});nwr["craft"](${b}););out center tags;`;params.set('data',nq);requestInit={...init,body:params.toString()};}
  }
 }catch(e){console.warn('[MTRW] Heist query extension',e)}
 const response=await nativeFetch(input,requestInit);
 try{
  const data=await response.clone().json();let changed=false;
  for(const el of(data.elements||[])){const t=el.tags||{};if(t.landuse==='industrial'||t.industrial||t.craft){if(!t.shop)t.shop='industrial_area';if(!t.name)t.name='Industriegebiet';el.tags=t;changed=true}}
  if(changed)return new Response(JSON.stringify(data),{status:response.status,statusText:response.statusText,headers:response.headers});
 }catch(e){}
 return response;
};

/* Patch the dynamically loaded game core before it executes. */
const nativeAppend=Node.prototype.appendChild;
Node.prototype.appendChild=function(node){
 try{
  if(node&&node.tagName==='SCRIPT'&&/\/game\.js(?:\?|$)/.test(node.src||'')&&!node.dataset.mtrwHeistPatched){
   node.dataset.mtrwHeistPatched='loading';const originalSrc=node.src;
   nativeFetch(originalSrc).then(r=>r.text()).then(src=>{
    let patched=src;
    patched=patched.replace('map.getZoom()<13','map.getZoom()<12');
    patched=patched.replace("const classifyPoi=tags=>{const shop=tags?.shop||'',amenity=tags?.amenity||'';if(amenity==='bank')return'Bank';if(amenity==='marketplace')return'Markt';if(shop)return`Laden${shop&&shop!=='yes'?' · '+shop:''}`;if(amenity==='atm')return'Geldautomat';return null};","const classifyPoi=tags=>{const shop=tags?.shop||'',amenity=tags?.amenity||'';if(tags?.landuse==='industrial'||tags?.industrial||tags?.craft)return'Industriegebiet';if(amenity==='bank')return'Bank';if(shop)return`Laden${shop&&shop!=='yes'?' · '+shop:''}`;return null};");
    patched=patched.replaceAll('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png','https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png');
    patched=patched.replaceAll("attribution:'© OpenStreetMap contributors'","attribution:'© OpenStreetMap © CARTO'");
    console.info('[MTRW] V1 dark world map active');
    node.src=URL.createObjectURL(new Blob([patched],{type:'text/javascript'}));node.dataset.mtrwHeistPatched='done';nativeAppend.call(this,node);
   }).catch(err=>{console.error('[MTRW] game patch failed',err);node.dataset.mtrwHeistPatched='error';nativeAppend.call(this,node)});
   return node;
  }
 }catch(e){console.warn('[MTRW] script patch failed',e)}
 return nativeAppend.call(this,node);
};
})();