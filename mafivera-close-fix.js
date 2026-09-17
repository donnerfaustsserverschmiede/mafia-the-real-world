/* MAFIVERA V1 — close button alignment fix */
(()=>{'use strict';
const style=document.createElement('style');
style.id='mtrw-close-fix';
style.textContent=`
.mf-app .close-btn{
  position:relative!important;
  display:grid!important;
  place-items:center!important;
  width:50px!important;
  height:50px!important;
  min-width:50px!important;
  min-height:50px!important;
  max-width:50px!important;
  max-height:50px!important;
  margin:0!important;
  padding:0!important;
  border-radius:50%!important;
  line-height:1!important;
  text-align:center!important;
  vertical-align:middle!important;
  transform:none!important;
  overflow:hidden!important;
  box-sizing:border-box!important;
  font-family:Arial,system-ui,sans-serif!important;
  font-size:30px!important;
}
.mf-app .close-btn::first-letter{line-height:1!important}
.mf-app .drawer-head>.close-btn{flex:0 0 50px!important;align-self:center!important}
.mf-app .territory-head>.close-btn{flex:0 0 50px!important;align-self:center!important}
@media(max-width:600px){
 .mf-app .close-btn{width:48px!important;height:48px!important;min-width:48px!important;min-height:48px!important;max-width:48px!important;max-height:48px!important;font-size:29px!important}
 .mf-app .drawer-head>.close-btn,.mf-app .territory-head>.close-btn{flex-basis:48px!important}
}
`;
document.head.appendChild(style);
})();