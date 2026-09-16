/* MAFIVERA V1 — readable resource symbolism */
(()=>{'use strict';
const style=document.createElement('style');style.textContent=`
.resource-icon.money{color:#20d96b!important;background:rgba(9,45,23,.95)!important;border:1px solid #20d96b88!important}
.resource-icon.material{color:#b87942!important;background:rgba(58,34,20,.95)!important;border:1px solid #b8794288!important}
.resource-icon.reputation{color:#ffd21f!important;background:rgba(62,52,5,.95)!important;border:1px solid #ffd21f88!important}
.resource-icon{font-weight:1000!important;text-shadow:0 1px 4px #000!important;box-shadow:0 2px 10px #000b!important}
`;document.head.appendChild(style);
const symbols={money:'＄',material:'▣',reputation:'★'};
const paint=()=>document.querySelectorAll('.resource-icon').forEach(e=>{const k=Object.keys(symbols).find(x=>e.classList.contains(x));if(k)e.textContent=symbols[k]});
paint();new MutationObserver(paint).observe(document.body,{childList:true,subtree:true});setInterval(paint,1500);
})();