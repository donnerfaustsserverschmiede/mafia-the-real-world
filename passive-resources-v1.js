/* MAFIVERA V1 — Passive Ressourcen
 * Jedes eroberte Feld produziert dauerhaft seine Eigenschaften.
 * Basis: 1 Einheit pro Minute und Eigenschaft.
 * Ruhmpunkte sind nur für Levelaufstiege bestimmt.
 * Gebäude können die Produktion über state.built[fieldId] erhöhen.
 */
(()=>{'use strict';
if(window.mtrwPassiveResourcesV1)return;window.mtrwPassiveResourcesV1=true;
const KEY_PREFIX='mafivera:v1:save:';
const BASE_PER_MINUTE=1;
const MAX_CATCHUP_DAYS=30;
const LEVEL_RUHM=100;
let userId=null,storageKey=null,lastRun=0;
const num=v=>Math.max(0,Number(v)||0);
const fmt=v=>num(v).toLocaleString('de-DE');
const notify=(text)=>{try{window.mtrwPlayerEvent?.(text)}catch(e){}};
const getSave=()=>{if(!storageKey)return null;try{return JSON.parse(localStorage.getItem(storageKey)||'null')}catch(e){return null}};
const writeSave=s=>{if(!storageKey)return;try{localStorage.setItem(storageKey,JSON.stringify(s))}catch(e){}};
const buildingMultiplier=b=>{
 if(!b)return 1;
 if(typeof b==='number')return 1+Math.max(0,b)*0.5;
 if(typeof b==='string')return 2;
 const level=num(b.level||b.stufe||b.upgrade||0);
 return 1+level*0.5;
};
const settle=()=>{
 const s=getSave();if(!s)return;
 const now=Date.now();
 const previous=num(s.passiveProductionLastAt)||now;
 const elapsed=Math.max(0,Math.min(now-previous,MAX_CATCHUP_DAYS*86400000));
 if(elapsed<1000)return;
 const minutes=elapsed/60000;
 let money=0,material=0,reputation=0;
 for(const [id,f] of Object.entries(s.fields||{})){
   const props=Array.isArray(f?.props)?f.props:Array.isArray(f?.properties)?f.properties:[];
   const cellProps=props.length?props:[];
   const mult=buildingMultiplier((s.built||{})[id]);
   const gain=BASE_PER_MINUTE*minutes*mult;
   if(cellProps.includes('money'))money+=gain;
   if(cellProps.includes('material'))material+=gain;
   if(cellProps.includes('reputation')||cellProps.includes('influence'))reputation+=gain;
 }
 if(money||material||reputation){
   s.money=num(s.money)+money;
   s.material=num(s.material)+material;
   const oldRuhm=num(s.reputation??s.influence);
   s.reputation=oldRuhm+reputation;
   s.influence=s.reputation;
   const before=num(s.level)||1;
   s.level=Math.max(1,1+Math.floor(s.reputation/LEVEL_RUHM));
   if(s.level>before)notify('Level aufgestiegen');
 }
 s.passiveProductionLastAt=now;
 s.lastSaved=new Date(now).toISOString();
 writeSave(s);
 render(s);
};
const render=s=>{
 const ids={money:s.money,material:s.material,reputation:s.reputation,level:s.level};
 for(const [id,value] of Object.entries(ids)){const el=document.getElementById(id);if(el)el.textContent=fmt(value)}
 let el=document.getElementById('reputation');
 if(!el)return;
 const box=el.closest('span');if(box&&!box.querySelector('.hud-stat-label')){
   box.classList.add('hud-stat','hud-reputation');
   const label=document.createElement('small');label.className='hud-stat-label';label.textContent='RUHMPUNKTE';box.insertBefore(label,el);
 }
};
const installHud=()=>{
 const stats=document.querySelector('.hud-stats');if(!stats)return;
 if(!document.getElementById('reputation')){
   const box=document.createElement('span');box.className='hud-stat hud-reputation';box.innerHTML='<small class="hud-stat-label">RUHMPUNKTE</small><b id="reputation">0</b>';stats.appendChild(box);
 }
 const s=getSave();if(s)render(s);
};
const start=async()=>{
 if(!window.db){setTimeout(start,500);return}
 try{const r=await window.db.auth.getSession();userId=r.data?.session?.user?.id}catch(e){}
 if(!userId){setTimeout(start,1000);return}
 storageKey=KEY_PREFIX+userId;
 installHud();settle();
 setInterval(()=>{installHud();settle()},10000);
};
const style=document.createElement('style');style.textContent='.hud-reputation{border-color:rgba(255,207,72,.28)!important;box-shadow:inset 0 0 16px rgba(255,207,72,.045)!important}.hud-reputation small{color:#ffd45a!important}.hud-reputation b{color:#ffe7a0!important}';document.head.appendChild(style);
start();
})();