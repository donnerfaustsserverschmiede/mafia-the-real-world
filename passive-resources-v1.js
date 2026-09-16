/* MAFIVERA V1 — Passive Ressourcen
 * Jedes eroberte Feld produziert dauerhaft seine Eigenschaften.
 * Basis: 1 Einheit pro Minute und Eigenschaft.
 * Ruhmpunkte sind ausschließlich für Levelaufstiege bestimmt.
 * Gebäude erhöhen die Produktion: +50 % pro Gebäudestufe.
 */
(()=>{'use strict';
if(window.mtrwPassiveResourcesV1)return;window.mtrwPassiveResourcesV1=true;
const KEY_PREFIX='mafivera:v1:save:',BASE_PER_MINUTE=1,MAX_CATCHUP_DAYS=30,LEVEL_RUHM=100;let userId=null,storageKey=null;
const num=v=>Math.max(0,Number(v)||0),fmt=v=>num(v).toLocaleString('de-DE');
const gridProps=(row,col)=>{const n=Math.abs(row*31+col*17),a=n%3,b=(row+col+9)%3,props=a===0?['material','money']:a===1?['reputation','material']:['money','reputation'];if(b===0)props.reverse();return props};
const fieldProps=(id,f)=>{const p=f?.props||f?.properties;if(Array.isArray(p)&&p.length)return p;const m=String(id||'').match(/^g_(-?\d+)_(-?\d+)$/);return m?gridProps(Number(m[1]),Number(m[2])):[]};
const buildingMultiplier=b=>{if(!b)return 1;if(typeof b==='number')return 1+Math.max(0,b)*.5;if(typeof b==='string')return 2;return 1+num(b.level||b.stufe||b.upgrade)*.5};
const notify=t=>{try{window.mtrwPlayerEvent?.(t)}catch(e){}};
const getSave=()=>{try{return JSON.parse(localStorage.getItem(storageKey)||'null')}catch(e){return null}};
const writeSave=s=>{try{localStorage.setItem(storageKey,JSON.stringify(s))}catch(e){}};
const render=s=>{for(const [id,value] of Object.entries({money:s.money,material:s.material,reputation:s.reputation,level:s.level})){const el=document.getElementById(id);if(el)el.textContent=fmt(value)}};
const settle=()=>{const s=getSave();if(!s)return;const now=Date.now(),previous=num(s.passiveProductionLastAt)||now,elapsed=Math.max(0,Math.min(now-previous,MAX_CATCHUP_DAYS*86400000));if(elapsed<1000)return;const minutes=elapsed/60000;let money=0,material=0,reputation=0;for(const [id,f] of Object.entries(s.fields||{})){const props=fieldProps(id,f),gain=BASE_PER_MINUTE*minutes*buildingMultiplier((s.built||{})[id]);if(props.includes('money'))money+=gain;if(props.includes('material'))material+=gain;if(props.includes('reputation')||props.includes('influence'))reputation+=gain}const oldRuhm=num(s.reputation??s.influence),before=Math.max(1,num(s.level)||1);s.money=num(s.money)+money;s.material=num(s.material)+material;s.reputation=oldRuhm+reputation;s.influence=s.reputation;s.level=Math.max(1,1+Math.floor(s.reputation/LEVEL_RUHM));s.passiveProductionLastAt=now;s.lastSaved=new Date(now).toISOString();writeSave(s);render(s);if(s.level>before)notify('Level aufgestiegen')};
const installHud=()=>{const stats=document.querySelector('.hud-stats');if(!stats)return;if(!document.getElementById('reputation')){const box=document.createElement('span');box.className='hud-stat hud-reputation';box.innerHTML='<small>RUHMPUNKTE</small><b id="reputation">0</b>';stats.appendChild(box)}const s=getSave();if(s)render(s)};
const style=document.createElement('style');style.textContent='.hud-reputation{border-color:rgba(255,207,72,.28)!important;box-shadow:inset 0 0 16px rgba(255,207,72,.045)!important}.hud-reputation small{color:#ffd45a!important}.hud-reputation b{color:#ffe7a0!important}';document.head.appendChild(style);
const start=async()=>{if(!window.db){setTimeout(start,500);return}try{userId=(await window.db.auth.getSession()).data?.session?.user?.id}catch(e){}if(!userId){setTimeout(start,1000);return}storageKey=KEY_PREFIX+userId;installHud();settle();setInterval(()=>{installHud();settle()},10000)};start();
})();