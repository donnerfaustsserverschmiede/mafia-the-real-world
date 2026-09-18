(()=>{'use strict';
if(window.__mtrwDiscordNav)return;window.__mtrwDiscordNav=true;
const INVITE='https://discord.gg/qRRP2EJ69f';
function add(){
 const nav=document.querySelector('.mf-bottom');
 if(!nav||document.getElementById('discordNav'))return;
 const b=document.createElement('button');
 b.id='discordNav';b.className='bottom-btn';b.type='button';
 b.innerHTML='<span>💬</span><small>DISCORD</small>';
 b.title='MAFIVERA Discord';b.setAttribute('aria-label','MAFIVERA Discord öffnen');
 b.addEventListener('click',()=>window.open(INVITE,'_blank','noopener,noreferrer'));
 nav.appendChild(b);
}
const s=document.createElement('style');s.textContent=`.mf-bottom{grid-template-columns:repeat(6,minmax(0,1fr))!important}.mf-bottom #discordNav{background:rgba(88,101,242,.16)!important;border-color:rgba(88,101,242,.5)!important}.mf-bottom #discordNav span{font-size:25px!important}.mf-bottom #discordNav small{font-weight:900!important}@media(max-width:480px){.mf-bottom #discordNav span{font-size:23px!important}.mf-bottom .bottom-btn{min-width:0!important}}`;document.head.appendChild(s);
new MutationObserver(add).observe(document.body,{childList:true,subtree:true});add();
})();