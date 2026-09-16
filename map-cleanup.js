/* MAFIVERA — final map cleanup: regular tiles stay neutral, icons keep their colors */
(()=>{'use strict';
const GL=.0018,GW=.0025,RADIUS=5;
const read=()=>{try{const k=Object.keys(localStorage).find(x=>x.startsWith('mafivera:v1:save:'));return k?JSON.parse(localStorage.getItem(k)||'{}'):{} }catch(e){return{}}};
const run=()=>{const map=window.mtrwMap,s=read();if(!map||!window.L||!s.worldOrigin)return;const p=window.mtrwLiveGps||s.gps||s.worldOrigin,pr=Math.floor((p.lat-s.worldOrigin.lat)/GL),pc=Math.floor((p.lng-s.worldOrigin.lng)/GW);
map.eachLayer(l=>{if(!(l instanceof L.Rectangle)||!l.getBounds)return;const w=Number(l.options?.weight||0);if(w!==1&&w!==2.5)return;const c=l.getBounds().getCenter(),r=Math.floor((c.lat-s.worldOrigin.lat)/GL),col=Math.floor((c.lng-s.worldOrigin.lng)/GW);if(Math.abs(r-pr)>RADIUS||Math.abs(col-pc)>RADIUS){map.removeLayer(l);return}const own=!!s.fields?.[`g_${r}_${col}`];const color=own?'#3b82f6':'#85898e';l.setStyle({color,fillColor:color,weight:own?3:1,fillOpacity:own?.26:0});l.bringToBack()});
map.eachLayer(l=>{if(!(l instanceof L.Marker)||!l.getIcon)return;const cn=l.getIcon()?.options?.className||'';if(cn!=='resource-icons')return;const q=l.getLatLng(),r=Math.floor((q.lat-s.worldOrigin.lat)/GL),c=Math.floor((q.lng-s.worldOrigin.lng)/GW);if(Math.abs(r-pr)>RADIUS||Math.abs(c-pc)>RADIUS)map.removeLayer(l)});
};
const wait=()=>{if(window.mtrwMap){run();setInterval(run,700)}else setTimeout(wait,250)};wait();
})();
