/* MAFIVERA — immediate menu shell. The real menu function refreshes the content after opening. */
(()=>{'use strict';
function openShell(panel){
 const body=document.getElementById('drawerBody'),title=document.getElementById('drawerTitle'),drawer=document.getElementById('drawer');
 if(!body||!title||!drawer)return;
 let t='',html='';
 if(panel==='family'){
  t='Familie';
  html='<div class="hero"><span class="hero-icon">♜</span><div><b>Familie</b><p>Familienübersicht, Mitglieder und Ränge.</p></div></div><div class="statgrid"><div><b>♜</b><small>Familie</small></div><div><b>👥</b><small>Mitglieder</small></div><div><b>🏆</b><small>Ränge</small></div></div><div class="list"><button class="action" data-action="family-list">👥 Familien suchen</button></div>';
 }else if(panel==='business'){
  t='Produktion';
  html='<div class="production-card"><h3>⚗️ Drogenproduktion</h3><div class="production-field"><label>Droge auswählen</label><select><option>Bitte Droge auswählen …</option></select></div><div class="production-field"><label>Menge</label><input type="number" min="1" value="1"></div><button class="action primary" disabled>⚗️ Drogenproduktion starten</button></div><div class="production-card"><h3>🏭 Waffenproduktion</h3><div class="production-field"><label>Waffe auswählen</label><select><option>Bitte Waffe auswählen …</option></select></div><div class="production-field"><label>Menge</label><input type="number" min="1" value="1"></div><button class="action primary" disabled>🏭 Waffenproduktion starten</button></div>';
 }else if(panel==='social'){
  t='Sozial';
  html='<div class="tabs social-tabs"><button class="mini active">👥 Freundeliste</button><button class="mini">➕ Freunde hinzufügen</button><button class="mini">🏆 Spielerrangliste</button></div><div class="social-block"><h3>👥 Freunde</h3><div class="hint">Freunde, Freundschaftsanfragen und Spielerrangliste.</div></div>';
 }else if(panel==='hitmen'){
  t='Schläger';
  const p=window.__mtrwProfile||{};
  html='<div class="hero"><span class="hero-icon">👤</span><div><b>'+Number(p.hitmen||0).toLocaleString('de-DE')+' freie Schläger</b><p>Rekrutierungszentren produzieren automatisch weiter.</p></div></div><div class="statgrid"><div><b>'+Number(p.recruitment_centers||0).toLocaleString('de-DE')+'</b><small>Zentren</small></div><div><b>'+Number(p.garrison||0).toLocaleString('de-DE')+'</b><small>Stationiert</small></div><div><b>'+Number(p.max_hitmen||0).toLocaleString('de-DE')+'</b><small>Kapazität</small></div></div>';
 }else return;
 title.textContent=t;body.innerHTML=html;drawer.classList.remove('hidden');
}
function install(){
 const root=document.getElementById('gameRoot'); if(!root){setTimeout(install,50);return}
 document.addEventListener('pointerdown',e=>{
   const b=e.target?.closest?.('.bottom-btn'); if(!b)return;
   const p=b.dataset.panel; if(p&&p!=='map')openShell(p);
 },true);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();