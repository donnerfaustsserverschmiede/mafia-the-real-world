/* MAFIVERA — territory colors + strict 20-field view + fixed bottom navigation */
(()=>{'use strict';
const GL=.0018,GW=.0025,MAX=20;
const css=document.createElement('style');css.textContent=`
.bottom-nav{position:fixed!important;z-index:9999!important;left:50%!important;right:auto!important;bottom:0!important;transform:translateX(-50%)!important;width:calc(100% - 10px)!important;max-width:760px!important;height:122px!important;min-height:122px!important;grid-template-columns:repeat(6,minmax(0,1fr))!important;gap:6px!important;padding:9px 8px max(9px,env(safe-area-inset-bottom))!important;border-radius:24px 24px 0 0!important;touch-action:none!important;user-select:none!important}
.bottom-nav .bottom-btn{min-height:98px!important;height:100%!important;border-radius:18px!important;gap:8px!important}
.bottom-nav .bottom-btn span{font-size:30px!important;line-height:1!important}.bottom-nav .bottom-btn small{font-size:11px!important;line-height:1.1!important;letter-spacing:.7px!important;white-space:nowrap!important}
.drawer{bottom:132px!important}
@media(max-width:480px){.bottom-nav{height:126px!important;min-height:126px!important;width:calc(100% - 8px)!important;padding:8px 6px max(8px,env(safe-area-inset-bottom))!important}.bottom-nav .bottom-btn{min-height:104px!important}.bottom-nav .bottom-btn span{font-size:28px!important}.bottom-nav .bottom-btn small{font-size:10px!important}.drawer{bottom:136px!important}}
`;
document.head.appendChild(css);
const read=()=>{try{const k=Object.keys(localStorage).find(x=>x.startsWith('mafivera:v1:save:'));return k?JSON.parse(localStorage.getItem(k)||'{}'):{} }catch(e){return{}}};
const center=()=>{const s=read();return window.mtrwLiveGps||s.gps||s.worldOrigin||null};
const cellFromLayer=(l,s)=>{if(!l?.getBounds||!s.worldOrigin)return null;const c=l.getBounds().getCenter();return{r:Math.floor((c.lat-s.worldOrigin.lat)/GL),col:Math.floor((c.lng-s.worldOrigin.lng)/GW)};};
const distance=(l,p)=>{if(!l?.getLatLng)return 1e12;const c=l.getLatLng();const dr=(c.lat-p.lat)/GL,dc=(c.lng-p.lng)/GW;return dr*dr+dc*dc};
const enforce=()=>{const map=window.mtrwMap;if(!map||!window.L)return;const s=read(),p=center();if(!p||!s.worldOrigin)return;
 const base=[],markers=[];
 map.eachLayer(l=>{if(l instanceof L.Rectangle&&l.getBounds){const w=Number(l.options?.weight||0);if(w===1||w===2.5)base.push(l)}else if(l instanceof L.Marker&&l.getIcon){const cn=l.getIcon()?.options?.className||'';if(cn==='resource-icons')markers.push(l)}});
 base.sort((a,b)=>{const ca=a.getBounds().getCenter(),cb=b.getBounds().getCenter();const da=Math.pow((ca.lat-p.lat)/GL,2)+Math.pow((ca.lng-p.lng)/GW,2),db=Math.pow((cb.lat-p.lat)/GL,2)+Math.pow((cb.lng-p.lng)/GW,2);return da-db});
 const keep=new Set(base.slice(0,MAX));base.forEach(l=>{const c=cellFromLayer(l,s),owned=!!(c&&s.fields?.[`g_${c.r}_${c.col}`]);if(!keep.has(l)){map.removeLayer(l);return}const n=Math.abs((c?.r||0)*31+(c?.col||0)*17)%3;const color=owned?'#3b82f6':n===0?'#8b5a2b':n===1?'#facc15':'#22c55e';l.setStyle({color,fillColor:color,weight:owned?3:2,fillOpacity:owned?.30:.22});l.bringToBack()});
 markers.sort((a,b)=>distance(a,p)-distance(b,p));const keepM=new Set(markers.slice(0,MAX));markers.forEach(l=>{if(!keepM.has(l))map.removeLayer(l)});
 map.eachLayer(l=>{if(!(l instanceof L.Rectangle)||!l.getBounds)return;const w=Number(l.options?.weight||0);if(w!==3)return;const c=cellFromLayer(l,s),owned=!!(c&&s.fields?.[`g_${c.r}_${c.col}`]);if(owned)l.setStyle({color:'#3b82f6',fillColor:'#3b82f6',weight:3,fillOpacity:.30})});
};
let busy=false;const tick=()=>{if(busy)return;busy=true;try{enforce()}finally{busy=false}};setTimeout(tick,1200);setInterval(tick,700);
})();
