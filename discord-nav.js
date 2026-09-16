/* MAFIVERA — Discord-Schnellzugriff, 8er-Navigation */
(()=>{'use strict';
const DISCORD_INVITE='https://discord.gg/qRRP2EJ69f';
const css=document.createElement('style');css.textContent=`
.bottom-nav{grid-template-columns:repeat(8,minmax(0,1fr))!important}
#discordNav{display:flex!important;align-items:center!important;justify-content:center!important;background:rgba(88,101,242,.18)!important;border-color:rgba(88,101,242,.5)!important}
#discordNav span{font-size:28px!important}#discordNav small{font-weight:900!important}
@media(max-width:480px){.bottom-nav{grid-template-columns:repeat(8,minmax(0,1fr))!important;gap:3px!important}.bottom-nav .bottom-btn{min-width:0!important;padding-left:1px!important;padding-right:1px!important}.bottom-nav .bottom-btn span{font-size:24px!important}.bottom-nav .bottom-btn small{font-size:8px!important;letter-spacing:.2px!important}#discordNav span{font-size:23px!important}}
`;
document.head.appendChild(css);
const add=()=>{const nav=document.querySelector('.bottom-nav');if(!nav)return;if(document.getElementById('discordNav'))return;const b=document.createElement('button');b.id='discordNav';b.className='bottom-btn';b.type='button';b.innerHTML='<span>💬</span><small>DISCORD</small>';b.title='MAFIVERA Discord';b.setAttribute('aria-label','MAFIVERA Discord öffnen');b.addEventListener('click',()=>window.open(DISCORD_INVITE,'_blank','noopener,noreferrer'));nav.appendChild(b)};
const tick=()=>{add();setTimeout(tick,500)};tick();
})();
