/* MAFIVERA V1 — Player XP progression bridge */
(()=>{'use strict';
if(window.__mtrwProgressionV2)return;window.__mtrwProgressionV2=true;
const key=()=>{const id=window.__mtrwUserId||window.__mtrwCurrentUser?.id;return id?'mafivera:v1:save:'+id:null};
const levelFromXp=x=>{let level=0,remain=Math.max(0,Number(x)||0),need=25;while(remain>=need){remain-=need;level++;need*=2;if(level>=60)break}return level};
const sync=()=>{const k=key();if(!k)return false;try{const s=JSON.parse(localStorage.getItem(k)||'{}');const tiles=Number(s.territories||Object.keys(s.fields||{}).length||0);const targetXp=tiles*25;let xp=Number(s.xp);if(!Number.isFinite(xp)||xp<targetXp)xp=targetXp;s.xp=xp;s.level=levelFromXp(xp);s.territories=tiles;if(typeof s.money!=='number')s.money=2000;localStorage.setItem(k,JSON.stringify(s));const lvl=document.getElementById('level');if(lvl)lvl.textContent=String(s.level);return true}catch(e){return false}};
const start=async()=>{try{if(window.db){const r=await window.db.auth.getSession(),u=r.data?.session?.user;if(u){window.__mtrwCurrentUser=u;window.__mtrwUserId=u.id}}}catch(e){}sync();setInterval(sync,700)};
start();
})();
