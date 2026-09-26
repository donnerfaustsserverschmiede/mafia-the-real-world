/* MAFIVERA — Master Ingame Announcements */
(()=>{'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rewards={
 money:{label:'💵 Geld',suffix:'$'},
 material:{label:'🧱 Material',suffix:'Material'},
 weapon_parts:{label:'🔩 Waffenteile',suffix:'Waffenteile'},
 reputation:{label:'⭐ Reputation',suffix:'Reputation'},
 hitmen:{label:'🥊 Schläger',suffix:'Schläger'}
};
function mount(){
 if(!window.__mtrwAdmin?.can_admin||window.__mtrwAdmin.role!=='master')return;
 const body=document.getElementById('mtrwAdminBody');if(!body)return;
 if(document.getElementById('mtrwMasterAnnouncementBox'))return;
 const box=document.createElement('section');box.id='mtrwMasterAnnouncementBox';
 box.innerHTML=`<div class="admin-master-announcement">
   <div class="admin-master-ann-head"><span class="admin-icon">📢</span><div><b>Ingame-Announcements</b><p>Nachricht an alle Spieler — optional mit einmaliger Belohnung.</p></div></div>
   <div class="ann-field"><label>Betreff</label><input id="annTitle" maxlength="100" placeholder="z. B. Server-News"></div>
   <div class="ann-field"><label>Nachricht</label><textarea id="annMessage" maxlength="1000" rows="5" placeholder="Deine Nachricht an alle Spieler …"></textarea></div>
   <div class="ann-grid">
     <div class="ann-field"><label>Belohnung</label><select id="annRewardType">
       <option value="">Keine Belohnung</option>
       <option value="money">💵 Geld</option>
       <option value="material">🧱 Material</option>
       <option value="weapon_parts">🔩 Waffenteile</option>
       <option value="reputation">⭐ Reputation</option>
       <option value="hitmen">🥊 Schläger</option>
     </select></div>
     <div class="ann-field" id="annRewardAmountWrap" style="display:none"><label>Menge</label><input id="annRewardAmount" type="number" min="1" max="1000000000" step="1" inputmode="numeric" placeholder="Menge"></div>
   </div>
   <div class="ann-field"><label>Anzeige-Dauer</label><select id="annMinutes"><option value="5">5 Minuten</option><option value="10" selected>10 Minuten</option><option value="30">30 Minuten</option><option value="60">1 Stunde</option><option value="0">Unbegrenzt</option></select></div>
   <button id="annSend" class="action danger">📢 Announcement veröffentlichen</button>
 </div>`;
 body.appendChild(box);
 const type=document.getElementById('annRewardType'),wrap=document.getElementById('annRewardAmountWrap');
 type.onchange=()=>{wrap.style.display=type.value?'block':'none';if(!type.value)document.getElementById('annRewardAmount').value=''};
 document.getElementById('annSend').onclick=async()=>{
   const title=document.getElementById('annTitle').value.trim(),message=document.getElementById('annMessage').value.trim(),minutes=Number(document.getElementById('annMinutes').value),rt=type.value;
   const ra=rt?Number(document.getElementById('annRewardAmount').value):null;
   if(!title||!message){alert('Bitte Betreff und Nachricht eingeben.');return}
   if(rt&&(!Number.isInteger(ra)||ra<1)){alert('Bitte eine gültige Belohnungsmenge eingeben.');return}
   const btn=document.getElementById('annSend');btn.disabled=true;
   try{
     const r=await window.db.rpc('mtrw_admin_announce',{p_title:title,p_message:message,p_minutes:minutes,p_reward_type:rt||null,p_reward_amount:ra});
     if(r.error)throw r.error;
     alert('Announcement wurde veröffentlicht und an alle Spieler verteilt.');
     document.getElementById('annTitle').value='';document.getElementById('annMessage').value='';type.value='';wrap.style.display='none';document.getElementById('annRewardAmount').value='';
   }catch(e){alert(e.message||'Announcement konnte nicht veröffentlicht werden.')}
   finally{btn.disabled=false}
 };
}
const style=document.createElement('style');style.textContent=`
#annTitle,#annMessage,#annRewardType,#annRewardAmount,#annMinutes{box-sizing:border-box;width:100%;background:#0b1016;color:#fff;border:1px solid #394653;border-radius:10px;padding:10px;font-size:16px}
#annTitle,#annRewardType,#annRewardAmount,#annMinutes{height:46px}
#annMessage{resize:vertical;min-height:110px;font-family:inherit;line-height:1.4}
#annSend{width:100%!important;margin-top:4px}
.admin-master-announcement{margin-top:18px;padding:14px;background:#171d27;border:1px solid #7d2730;border-radius:16px}
.admin-master-ann-head{display:flex;gap:12px;align-items:center;margin-bottom:12px}.admin-master-ann-head b{font-size:18px}.admin-master-ann-head p{margin:3px 0 0;color:#9ba6b4;font-size:12px}
.ann-field{margin:9px 0}.ann-field label{display:block;font-weight:800;font-size:12px;margin-bottom:5px}.ann-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
@media(max-width:600px){.ann-grid{grid-template-columns:1fr}}
`;document.head.appendChild(style);
let tries=0;const wait=setInterval(()=>{if(window.__mtrwAdmin?.can_admin){clearInterval(wait);mount()}else if(++tries>120)clearInterval(wait)},500);
new MutationObserver(()=>{if(window.__mtrwAdmin?.role==='master')mount()}).observe(document.body,{childList:true,subtree:true});
})();