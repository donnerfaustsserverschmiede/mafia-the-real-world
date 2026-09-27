(()=>{'use strict';
const KEY='mtrw-menu-cache-v1';
const panels=new Map([['family','Familie'],['business','Produktion'],['hitmen','Schläger'],['social','Soziales']]);
const cache=JSON.parse(sessionStorage.getItem(KEY)||'{}');
const save=()=>{try{sessionStorage.setItem(KEY,JSON.stringify(cache))}catch(_){}};
function drawer(){return document.getElementById('drawer')}
function body(){return document.getElementById('drawerBody')}
function showFast(panel){
 const d=drawer(),b=body(); if(!d||!b)return;
 const title=panels.get(panel)||'MAFIVERA';
 d.classList.remove('hidden');
 const cached=cache[panel];
 document.getElementById('drawerTitle').textContent=title;
 if(cached){b.innerHTML=cached+'<div class="mtrw-fast-refresh">↻ Wird im Hintergrund aktualisiert …</div>'}
 else b.innerHTML='<div class="mtrw-fast-loading"><div class="mtrw-fast-spinner"></div><b>'+title+'</b><span>Daten werden geladen …</span></div>';
}
document.addEventListener('click',e=>{
 const btn=e.target.closest?.('.bottom-btn');
 if(!btn)return;
 const panel=btn.dataset.panel;
 if(!panels.has(panel))return;
 showFast(panel);
},true);
const observer=new MutationObserver(()=>{
 const d=drawer(),b=body(),t=document.getElementById('drawerTitle');
 if(!d||d.classList.contains('hidden')||!b||!t)return;
 const panel=[...panels].find(([,v])=>v===t.textContent)?.[0];
 if(!panel||b.querySelector('.mtrw-fast-loading'))return;
 const clone=b.cloneNode(true);
 clone.querySelectorAll('.mtrw-fast-refresh').forEach(x=>x.remove());
 cache[panel]=clone.innerHTML;save();
});
const start=()=>{const d=drawer();if(d)observer.observe(d,{subtree:true,childList:true,characterData:true})};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
const st=document.createElement('style');st.textContent=
'.mtrw-fast-loading{min-height:180px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;color:#fff;text-align:center}.mtrw-fast-loading span{color:#aeb8c4;font-size:14px}.mtrw-fast-spinner{width:30px;height:30px;border:3px solid #394653;border-top-color:#d6ad2d;border-radius:50%;animation:mtrwSpin .7s linear infinite}.mtrw-fast-refresh{margin:12px 0;padding:8px;text-align:center;color:#8f9baa;font-size:12px;border-top:1px solid #27313c}@keyframes mtrwSpin{to{transform:rotate(360deg)}}';
document.head.appendChild(st);
window.__mtrwMenuAccelerator={version:'1.0'};
})();