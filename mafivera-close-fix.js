/* MAFIVERA V1 — definitive close button alignment */
(()=>{'use strict';
const style=document.createElement('style');
style.id='mtrw-close-fix-v2';
style.textContent=`
.mf-app .close-btn{position:relative!important;display:flex!important;align-items:center!important;justify-content:center!important;width:50px!important;height:50px!important;min-width:50px!important;min-height:50px!important;max-width:50px!important;max-height:50px!important;margin:0!important;padding:0!important;border-radius:50%!important;box-sizing:border-box!important;overflow:hidden!important;font-size:0!important;line-height:0!important;text-align:center!important;transform:none!important;flex:0 0 50px!important;align-self:center!important}
.mf-app .close-btn::after{content:'×'!important;display:block!important;width:100%!important;height:100%!important;font-family:Arial,sans-serif!important;font-size:30px!important;font-weight:400!important;line-height:48px!important;text-align:center!important;position:absolute!important;inset:0!important;margin:0!important;padding:0!important;transform:none!important}
.mf-app .drawer-head>.close-btn,.mf-app .territory-head>.close-btn{align-self:center!important}
@media(max-width:600px){.mf-app .close-btn{width:48px!important;height:48px!important;min-width:48px!important;min-height:48px!important;max-width:48px!important;max-height:48px!important;flex-basis:48px!important}.mf-app .close-btn::after{font-size:29px!important;line-height:46px!important}}
`;
document.head.appendChild(style);
})();