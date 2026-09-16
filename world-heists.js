/* MAFIVERA V1 — World Heist Areas + Dark Map */
(()=>{'use strict';
if(window.mtrwWorldHeistAreasInstalled)return;
window.mtrwWorldHeistAreasInstalled=true;
const nativeFetch=window.fetch.bind(window);

/* Overpass-Abfragen erweitern: Läden, Banken und echte Industrieflächen. */
window.fetch=async(input,init)=>{
  const url=typeof input==='string'?(input):(input?.url||'');
  if(!url.includes('overpass-api.de/api/interpreter')&&!url.includes('overpass.private.coffee/api/interpreter'))return nativeFetch(input,init);
  let requestInit=init;
  try{
    if(init?.body&&typeof init.body==='string'&&init.body.includes('data=')){
      const params=new URLSearchParams(init.body),q=decodeURIComponent(params.get('data')||'');
      const m=q.match(/nwr\["shop"\]\(([^)]+)\)/);
      if(m){
        const b=m[1];
        const nq=`[out:json][timeout:25];(nwr["shop"](${b});nwr["amenity"="bank"](${b});nwr["landuse"="industrial"](${b});nwr["industrial"](${b});nwr["craft"](${b}););out center tags;`;
        params.set('data',nq);requestInit={...init,body:params.toString()};
      }
    }
  }catch(e){console.warn('[MTRW] World-Heist query extension failed',e)}
  const response=await nativeFetch(input,requestInit);
  try{
    const data=await response.clone().json();let changed=false;
    for(const el of(data.elements||[])){
      const t=el.tags||{};
      if(t.landuse==='industrial'||t.industrial||t.craft){
        if(!t.shop)t.shop='industrial_area';
        if(!t.name)t.name='Industriegebiet';
        el.tags=t;changed=true;
      }
    }
    if(changed)return new Response(JSON.stringify(data),{status:response.status,statusText:response.statusText,headers:response.headers});
  }catch(e){}
  return response;
};

/* V1 Game-Core patch: Heists, globale entdeckte Ziele und dunkle Ingame-Karte. */
const nativeAppend=Node.prototype.appendChild;
Node.prototype.appendChild=function(node){
  try{
    if(node&&node.tagName==='SCRIPT'&&/\/game\.js(?:\?|$)/.test(node.src||'')&&!node.dataset.mtrwHeistPatched){
      node.dataset.mtrwHeistPatched='loading';
      const originalSrc=node.src;
      nativeFetch(originalSrc).then(r=>r.text()).then(src=>{
        let patched=src;
        patched=patched.replace('map.getZoom()<13','map.getZoom()<12');
        patched=patched.replace("const classifyPoi=tags=>{const shop=tags?.shop||'',amenity=tags?.amenity||'';if(amenity==='bank')return'Bank';if(amenity==='marketplace')return'Markt';if(shop)return`Laden${shop&&shop!=='yes'?' · '+shop:''}`;if(amenity==='atm')return'Geldautomat';return null};","const classifyPoi=tags=>{const shop=tags?.shop||'',amenity=tags?.amenity||'';if(tags?.landuse==='industrial'||tags?.industrial||tags?.craft)return'Industriegebiet';if(amenity==='bank')return'Bank';if(shop)return`Laden${shop&&shop!=='yes'?' · '+shop:''}`;return null};");
        const qs=patched.indexOf('const q=`');
        const qe=patched.indexOf('`;const res=await fetch',qs);
        if(qs>=0&&qe>qs){
          const nq='const q=`[out:json][timeout:25];(nwr["shop"](${b.getSouth()},${b.getWest()},${b.getNorth()},${b.getEast()});nwr["amenity"="bank"](${b.getSouth()},${b.getWest()},${b.getNorth()},${b.getEast()});nwr["landuse"="industrial"](${b.getSouth()},${b.getWest()},${b.getNorth()},${b.getEast()});nwr["industrial"](${b.getSouth()},${b.getWest()},${b.getNorth()},${b.getEast()});nwr["craft"](${b.getSouth()},${b.getWest()},${b.getNorth()},${b.getEast()}););out center tags;`';
          patched=patched.slice(0,qs)+nq+patched.slice(qe+1);
        }
        patched=patched.replace('threatFields=[...mapByCell.values()];state.threatFields=threatFields;save();','{const merged=new Map(threatFields.map(x=>[x.cellId,x]));for(const x of mapByCell.values())merged.set(x.cellId,x);threatFields=[...merged.values()];state.threatFields=threatFields;save();}');
        patched=patched.replace('Math.floor(50000+Math.random()*50001)','Math.floor(50+Math.random()*99951)');
        patched=patched.replaceAll('50.000–100.000 $','50–100.000 $');
        const ac='const activeHeistFor=t=>state.heists.find(h=>h.cellId===t.id&&h.status===\'running\');';
        if(patched.includes(ac))patched=patched.replace(ac,ac+"\n const heistCooldownFor=t=>{const h=state.heists.filter(x=>x.cellId===t.id&&x.status==='resolved'&&x.resolvedAt).sort((a,b)=>b.resolvedAt-a.resolvedAt)[0];if(!h)return 0;const until=h.resolvedAt+60*60*1000;return Math.max(0,until-Date.now())};");
        const hs=patched.indexOf('const heistPopup=t=>{'),he=patched.indexOf('};\n const tilePopup',hs);
        if(hs>=0&&he>hs){
          const hp="const heistPopup=t=>{const th=threatFor(t),h=activeHeistFor(t),cooldown=heistCooldownFor(t);if(!th)return null;const left=h?Math.max(0,h.endsAt-Date.now()):0;return `<div class=\"popup-card heist-popup\"><b>🔴 ${esc(th.name)}</b><br><strong>Bedrohtes Feld</strong><br><span>${esc(th.typeLabel||'Geschäft / Bank / Industriegebiet')}</span><br><small>Heist: 30 Minuten · Erfolgschance: 50 % · Beute: 50–100.000 $</small>${h?`<div class=\"heist-running\">⚔ Schläger unterwegs<br><b>Noch ${Math.ceil(left/60000)} Min.</b></div>`:cooldown?`<div class=\"heist-running\">🔒 HEIST-COOLDOWN<br><b>Erneuter Überfall möglich in ${Math.ceil(cooldown/60000)} Min.</b></div>`:`<button onclick=\"window.mtrwStartHeist&&window.mtrwStartHeist('${t.id}')\">⚔ Schläger senden · Heist starten</button>`}</div>`};";
          patched=patched.slice(0,hs)+hp+patched.slice(he+2);
        }
        const startNeed="if(activeHeistFor(t)){toast('Für dieses Ziel läuft bereits ein Heist.');return}";
        if(patched.includes(startNeed))patched=patched.replace(startNeed,startNeed+"const cooldown=heistCooldownFor(t);if(cooldown){toast(`🔒 Heist-Cooldown · noch ${Math.ceil(cooldown/60000)} Min.`);open('territory',t);return}");
        patched=patched.replace('Banken, Sparkassen, Geldautomaten, Märkte und Geschäfte können hier Ziele sein.','Industriegebiete, Banken und Geschäfte können hier Ziele sein.');

        /* Dark Carto basemap wie im gewünschten MAFIVERA-Design. */
        patched=patched.replaceAll('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png','https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png');
        patched=patched.replaceAll("attribution:'© OpenStreetMap contributors'","attribution:'© OpenStreetMap © CARTO'");
        patched=patched.replaceAll("attribution:'© OpenStreetMap contributors'","attribution:'© OpenStreetMap © CARTO'");
        console.info('[MTRW] V1 World-Heist-Patch + Dark-Map aktiv');
        node.src=URL.createObjectURL(new Blob([patched],{type:'text/javascript'}));
        node.dataset.mtrwHeistPatched='done';
        nativeAppend.call(this,node);
      }).catch(err=>{console.error('[MTRW] Game-Patch fehlgeschlagen',err);node.dataset.mtrwHeistPatched='error';nativeAppend.call(this,node)});
      return node;
    }
  }catch(e){console.warn('[MTRW] Script-Patch konnte nicht ausgeführt werden',e)}
  return nativeAppend.call(this,node);
};
})();