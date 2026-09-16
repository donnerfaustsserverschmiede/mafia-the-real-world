/* MAFIVERA — clean map: 5-field radius, ownership only */
(()=>{'use strict';
const GL=.0018,GW=.0025,RADIUS=5;
const css=document.createElement('style');css.textContent=`
.bottom-nav{position:fixed!important;z-index:9999!important;left:50%!important;right:auto!important;bottom:0!important;transform:translateX(-50%)!important;width:calc(100% - 10px)!important;max-width:760px!important;height:122px!important;min-height:122px!important;grid-template-columns:repeat(7,minmax(0,1fr))!important;gap:6px!important;padding:9px 8px max(9px,env(safe-area-inset-bottom))!important;border-radius:24px 24px 0 0!important;touch-action:none!important;user-select:none!important}
.bottom-nav .bottom-btn{min-height:98px!important;height:100%!important;border-radius:18px!important;gap:8px!important}.bottom-nav .bottom-btn span{font-size:30px!important;line-height:1!important}.bottom-nav .bottom-btn small{font-size:11px!important;line-height:1.1!important;letter-spacing:.7px!important;white-space:nowrap!important}.drawer{bottom:132px!important}
@media(max-width:480px){.bottom-nav{height:126px!important;min-height:126px!important;width:calc(100% - 8px)!important;padding:8px 6px max(8px,env(safe-area-inset-bottom))!important}.bottom-nav .bottom-btn{min-height:104px!important}.bottom-nav .bottom-btn span{font-size:28px!important}.bottom-nav .bottom-btn small{font-size:10px!important}.drawer{bottom:136px!important}}
`;
document.head.appendChild(css);
const read=()=>{try{const k=Object.keys(localStorage).find(x=>x.startsWith('mafivera:v1:save:'));return k?JSON.parse(localStorage.getItem(k)||'{}'):{} }catch(e){return{}}};
const center=()=>{const s=read();return window.mtrwLiveGps||s.gps||s.worldOrigin||null};
const cellFromLayer=(l,s)=>{if(!l?.getBounds||!s.worldOrigin)return null;const c=l.getBounds().getCenter();return{r:Math.floor((c.lat-s.worldOrigin.lat)/GL),col:Math.floor((c.lng-s.worldOrigin.lng)/GW)};};
const enforce=()=>{const map=window.mtrwMap;if(!map||!window.L)return;const s=read(),p=center();if(!p||!s.worldOrigin)return;
 const pr=Math.floor((p.lat-s.worldOrigin.lat)/GL),pc=Math.floor((p.lng-s.worldOrigin.lng)/GW);
 map.eachLayer(l=>{if(!(l instanceof L.Rectangle)||!l.getBounds)return;const w=Number(l.options?.weight||0);if(w!==1&&w!==2.5)return;const c=cellFromLayer(l,s);if(!c)return;const inside=Math.abs(c.r-pr)<=RADIUS&&Math.abs(c.col-pc)<=RADIUS;if(!inside){map.removeLayer(l);return}const own=!!s.fields?.[`g_${c.r}_${c.col}`];const color=own?'#3b82f6':'#8b8f94';l.setStyle({color,fillColor:color,weight:own?3:1,fillOpacity:own?.28:0});l.bringToBack()});
 map.eachLayer(l=>{if(!(l instanceof L.Marker)||!l.getIcon)return;const cn=l.getIcon()?.options?.className||'';if(cn!=='resource-icons')return;const q=l.getLatLng(),r=Math.floor((q.lat-s.worldOrigin.lat)/GL),c=Math.floor((q.lng-s.worldOrigin.lng)/GW);if(Math.abs(r-pr)>RADIUS||Math.abs(c-pc)>RADIUS)map.removeLayer(l)});
};
const bind=()=>{const map=window.mtrwMap;if(!map||map.__mtrwCleanBound)return;map.__mtrwCleanBound=true;let timer=0;const schedule=()=>{clearTimeout(timer);timer=setTimeout(enforce,80)};map.on('moveend zoomend',schedule);window.addEventListener('mafivera:territoryChanged',schedule);window.addEventListener('mafivera:worldRefresh',schedule);setTimeout(enforce,300)};
let n=0;const wait=()=>{bind();if(!window.mtrwMap&&n++<100)setTimeout(wait,200)};wait();
})();
