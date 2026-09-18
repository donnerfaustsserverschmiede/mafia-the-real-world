/* MAFIVERA — isolated HUD layer */
(()=>{'use strict';
function install(){
  const mount=document.getElementById('mtrwHudMount');
  if(!mount)return;
  mount.innerHTML=`<div class="mf-hud" id="mtrwHud"><button id="menuBtn" class="mf-menu" type="button" aria-label="Menü">☰</button><div class="mf-stat money"><small>GELD</small><b id="hudMoney">0</b><em>MAFIA-KASSE</em></div><div class="mf-stat material"><small>MATERIAL</small><b id="hudMaterial">0</b><em>IM LAGER</em></div><div class="mf-stat drugs"><small>DROGEN</small><b id="hudDrugs">0</b><em>IM LAGER</em></div><div class="mf-stat hitmen"><small>SCHLÄGER</small><b id="hudHitmen">0</b><em>PRODUKTION</em></div><div class="mf-stat level"><small>LEVEL</small><b id="hudLevel">0</b><em>SPIELERSTUFE</em></div></div>`;
  document.getElementById('menuBtn').onclick=()=>window.mtrwMenu?.();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
window.mtrwInstallHud=install;
})();