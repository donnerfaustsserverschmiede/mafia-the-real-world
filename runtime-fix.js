/* MAFIVERA V1 runtime safeguards */
(()=>{'use strict';
if(!Object.prototype.hasOwnProperty.call(globalThis,'e'))globalThis.e=null;
if(!document.querySelector('link[data-mafivera-leaflet]')){const l=document.createElement('link');l.rel='stylesheet';l.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';l.dataset.mafiveraLeaflet='1';document.head.appendChild(l)}
/* Fresh players receive starter capital so the first territory can actually be claimed. Existing progress is untouched. */
const seedStarter=()=>{try{const u=window.db?.auth?.getSession;if(!u)return setTimeout(seedStarter,250);u.call(window.db.auth).then(({data})=>{const id=data?.session?.user?.id;if(!id)return;const k='mafivera:v1:save:'+id;if(localStorage.getItem(k))return;localStorage.setItem(k,JSON.stringify({money:1000,level:1,energy:100,material:0,product:0,territories:0,influence:0,family:null,labLevel:0,production:null,lastSaved:new Date().toISOString(),fields:{},built:{},dealer:null,gps:null,worldOrigin:null,eventFields:[],starterCapital:1000}))}).catch(()=>{})}catch(_){}};seedStarter();
})();