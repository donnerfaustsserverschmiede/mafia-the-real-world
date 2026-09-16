/* MAFIVERA V1 game shell
   Authenticated session -> game UI. No gameplay systems are assumed yet.
*/
(()=>{
  'use strict';
  const boot=async()=>{
    if(!window.db)return setTimeout(boot,100);
    const {data,error}=await window.db.auth.getSession();
    if(error||!data?.session){window.location.reload();return;}
    const user=data.session.user;
    const meta=user.user_metadata||{};
    const name=meta.username||user.email?.split('@')[0]||'Spieler';
    const root=document.getElementById('gameRoot');
    if(!root)return;
    root.innerHTML=`<div class="game-shell"><header class="game-top"><div><strong>MAFIVERA</strong><span>Die Welt gehört dir</span></div><div class="player-pill">👤 ${escapeHtml(name)}</div></header><main class="game-main"><section class="game-welcome"><p class="eyebrow">WILLKOMMEN IN DER STADT</p><h1>Hallo, ${escapeHtml(name)}.</h1><p>Dein Spieler ist angemeldet und deine Verbindung zum Spiel steht.</p><div class="status"><span class="dot"></span> Online · Konto verbunden</div></section><section class="game-grid"><div class="game-panel"><h2>🏙️ Deine Stadt</h2><p>Die Spielwelt wird hier als nächstes geladen.</p></div><div class="game-panel"><h2>👤 Dein Spieler</h2><p>Nutzername: <b>${escapeHtml(name)}</b></p><p>E-Mail: <span>${escapeHtml(user.email||'')}</span></p></div><div class="game-panel"><h2>💰 Vermögen</h2><p class="muted">Noch nicht eingerichtet</p></div><div class="game-panel"><h2>⭐ Fortschritt</h2><p class="muted">Noch nicht eingerichtet</p></div></section></main><button id="gameLogout" class="game-logout">Abmelden</button></div>`;
    document.getElementById('gameLogout').addEventListener('click',async()=>{await window.db.auth.signOut();window.location.reload();});
    if(typeof window.mtrwGameEvent==='function')window.mtrwGameEvent('Game geladen',{username:name});
  };
  const escapeHtml=(value)=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  boot();
})();
