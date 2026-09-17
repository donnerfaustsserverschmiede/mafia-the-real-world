/* MAFIVERA — Chat Abstand zur unteren Navigation */
(()=>{'use strict';
const STYLE_ID='mtrwChatLayoutStyle';
function apply(){
 if(!document.getElementById(STYLE_ID)){
  const s=document.createElement('style');s.id=STYLE_ID;s.textContent=`
   .mtrw-chat-floating{position:fixed!important;left:50%!important;bottom:78px!important;transform:translateX(-50%)!important;z-index:2500!important;margin:0!important}
   @media(max-width:600px){.mtrw-chat-floating{bottom:76px!important;max-width:calc(100vw - 32px)!important}}
  `;document.head.appendChild(s);
 }
 const candidates=[...document.querySelectorAll('button,[role="button"],a,div')];
 for(const el of candidates){
  const text=(el.textContent||'').trim();
  if(!text||(!/Global-Chat/i.test(text)&&!/Chat öffnen/i.test(text)))continue;
  const target=el.closest('button,[role="button"],a')||el;
  target.classList.add('mtrw-chat-floating');
  break;
 }
}
apply();
new MutationObserver(apply).observe(document.body,{subtree:true,childList:true,characterData:true});
setTimeout(apply,500);setTimeout(apply,1500);setTimeout(apply,3000);
})();
