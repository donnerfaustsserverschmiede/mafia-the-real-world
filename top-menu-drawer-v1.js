/* MAFIVERA V1 — mobile top menu drawer */
(()=>{'use strict';
if(window.__mtrwTopMenuDrawer)return;window.__mtrwTopMenuDrawer=true;
const css=`
#gameRoot .bottom-nav{display:none!important}
.mtrw-top-menu{position:fixed;top:max(10px,env(safe-area-inset-top));left:12px;z-index:3000;width:48px;height:48px;border:1px solid rgba(130,155,185,.35);border-radius:15px;background:rgba(5,10,17,.92);backdrop-filter:blur(12px);color:#fff;font-size:23px;display:flex;align-items:center;justify-content:center;box-shadow:0 8px 30px #0009;cursor:pointer}
.mtrw-top-menu.active{background:rgba(255,117,35,.18);border-color:#ff7523;color:#ff8a45}
.mtrw-menu-backdrop{position:fixed;inset:0;z-index:2998;background:rgba(0,0,0,.48);opacity:0;pointer-events:none;transition:opacity .2s}
.mtrw-menu-backdrop.open{opacity:1;pointer-events:auto}
.mtrw-side-drawer{position:fixed;top:0;left:0;bottom:0;z-index:2999;width:min(310px,82vw);padding:78px 16px 22px;background:linear-gradient(180deg,rgba(7,12,19,.99),rgba(3,7,12,.99));border-right:1px solid rgba(120,150,185,.25);box-shadow:20px 0 70px #000b;transform:translateX(-105%);transition:transform .24s ease;overflow:auto}
.mtrw-side-drawer.open{transform:translateX(0)}
.mtrw-side-title{font-size:11px;letter-spacing:3px;color:#ff7b32;margin:0 8px 14px;font-weight:800}
.mtrw-side-user{padding:13px 14px;margin-bottom:14px;border:1px solid rgba(255,255,255,.08);border-radius:15px;background:rgba(255,255,255,.035);color:#cbd3df;font-size:12px}
.mtrw-side-actions{display:flex;flex-direction:column;gap:8px}
.mtrw-side-btn{appearance:none;width:100%;height:54px;border:1px solid rgba(125,150,180,.17);border-radius:14px;background:#10161f;color:#dbe2eb;display:flex;align-items:center;gap:14px;padding:0 15px;text-align:left;font-weight:800;font-size:14px;cursor:pointer}
.mtrw-side-btn span{width:27px;text-align:center;font-size:20px}.mtrw-side-btn small{display:block;color:#7e8999;font-size:9px;letter-spacing:1.5px;margin-top:2px}.mtrw-side-btn.active{border-color:rgba(255,117,35,.55);background:rgba(255,117,35,.1);color:#ff914f}
`;
const st=document.createElement('style');st.id='mtrw-top-menu-style';st.textContent=css;document.head.appendChild(st);
const items=[['map','🗺️','KARTE'],['family','♜','FAMILIE'],['business','💼','GESCHÄFTE'],['hitmen','🥷','SCHLÄGER'],['social','♣','SOZIAL'],['more','▦','MEHR'],['profile','♙','PROFIL']];
const findBottom=key=>{const map={map:['karte','map'],family:['family'],business:['business','geschaefte','geschaft'],hitmen:['hitmen','schlaeger'],social:['social'],more:['more'],profile:['profile']};const keys=map[key]||[key];return [...document.querySelectorAll('.bottom-nav .bottom-btn')].find(b=>keys.includes(String(b.dataset.panel||'').toLowerCase())||keys.some(k=>b.textContent.toLowerCase().includes(k)))};
const close=()=>{document.querySelector('.mtrw-side-drawer')?.classList.remove('open');document.querySelector('.mtrw-menu-backdrop')?.classList.remove('open');document.querySelector('.mtrw-top-menu')?.classList.remove('active')};
const open=()=>{document.querySelector('.mtrw-side-drawer')?.classList.add('open');document.querySelector('.mtrw-menu-backdrop')?.classList.add('open');document.querySelector('.mtrw-top-menu')?.classList.add('active')};
const build=()=>{if(document.querySelector('.mtrw-side-drawer'))return true;const btn=document.createElement('button');btn.className='mtrw-top-menu';btn.type='button';btn.setAttribute('aria-label','Menü öffnen');btn.innerHTML='☰';btn.onclick=()=>document.querySelector('.mtrw-side-drawer')?.classList.contains('open')?close():open();
const back=document.createElement('div');back.className='mtrw-menu-backdrop';back.onclick=close;
const d=document.createElement('aside');d.className='mtrw-side-drawer';d.innerHTML='<div class="mtrw-side-title">MAFIVERA · MENÜ</div><div class="mtrw-side-user">Deine Spielsteuerung<br><small>Alle Bereiche zentral von hier aus erreichbar.</small></div><div class="mtrw-side-actions"></div>';
const a=d.querySelector('.mtrw-side-actions');items.forEach(([key,icon,label])=>{const b=document.createElement('button');b.type='button';b.className='mtrw-side-btn';b.dataset.mtrwMenu=key;b.innerHTML=`<span>${icon}</span><div>${label}<small>ÖFFNEN</small></div>`;b.onclick=()=>{const target=findBottom(key);if(target){target.click();close()}else{if(key==='family'||key==='profile'){const fallback=document.querySelector(`[data-mtrw-repair="${key}"]`);if(fallback)fallback.click()}close()}};a.appendChild(b)});
document.body.append(btn,back,d);return true};
const boot=()=>build();new MutationObserver(boot).observe(document.documentElement,{childList:true,subtree:true});boot();
})();
