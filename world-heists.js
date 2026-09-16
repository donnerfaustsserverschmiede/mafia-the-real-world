/* MAFIVERA V1 — World Heist Areas */
(()=>{'use strict';
if(window.mtrwWorldHeistAreasInstalled)return;
window.mtrwWorldHeistAreasInstalled=true;
const nativeFetch=window.fetch.bind(window);
window.fetch=async(input,init)=>{
  const url=typeof input==='string'?(input):(input?.url||'');
  if(!url.includes('overpass-api.de/api/interpreter')&&!url.includes('overpass.private.coffee/api/interpreter'))return nativeFetch(input,init);
  let requestInit=init;
  try{
    if(init?.body&&typeof init.body==='string'&&init.body.includes('data=')){
      const params=new URLSearchParams(init.body);
      const q=decodeURIComponent(params.get('data')||'');
      const b=q.match(/nwr\["shop"\]\(([^)]+)\)/)?.[1];
      if(b){
        const nq=`[out:json][timeout:25];(nwr["shop"](${b});nwr["amenity"="bank"](${b});nwr["landuse"="industrial"](${b});nwr["industrial"](${b});nwr["craft"](${b});nwr["name"~"Melschendorfer Markt",i](${b}););out center tags;`;
        params.set('data',nq);
        requestInit={...init,body:params.toString()};
      }
    }
  }catch(e){console.warn('[MTRW] World-Heist query extension failed',e)}
  const response=await nativeFetch(input,requestInit);
  try{
    const data=await response.clone().json();let changed=false;
    for(const el of(data.elements||[])){const t=el.tags||{};if(t.landuse==='industrial'||t.industrial||t.craft){if(!t.shop){t.shop='industrial_area';if(!t.name)t.name='Industriegebiet';el.tags=t;changed=true}}}
    if(changed)return new Response(JSON.stringify(data),{status:response.status,statusText:response.statusText,headers:response.headers});
  }catch(e){}
  return response;
};
})();