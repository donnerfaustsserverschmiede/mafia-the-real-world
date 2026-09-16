/* MAFIVERA — phone-only runtime */
(()=>{
  const isPhone=()=>window.matchMedia('(max-width: 768px) and (pointer: coarse)').matches || /Android|iPhone|iPod|Windows Phone/i.test(navigator.userAgent);
  function showPhoneStart(){
    const card=document.querySelector('#start .card');
    if(!card || card.dataset.mobileAuth==='1')return;
    card.dataset.mobileAuth='1';
    card.innerHTML=`<div class="logo mobile-login-logo"><img src="./assets/mafivera-logo.webp" alt="MAFIVERA"></div><h1>Willkommen zurück</h1><p>Melde dich an oder erstelle dein MAFIVERA-Konto. Dein Spielstand wird mit deinem Konto gespeichert.</p><input id="emailAuthEmail" type="email" autocomplete="email" inputmode="email" placeholder="E-Mail-Adresse"><input id="emailAuthPassword" type="password" autocomplete="current-password" placeholder="Passwort"><input id="emailAuthUsername" autocomplete="username" maxlength="24" placeholder="Username (nur bei Registrierung)" hidden><button class="primary" id="emailAuthButton" type="button">🔐 Anmelden</button><button class="secondary" id="emailRegisterButton" type="button">📝 Neues Konto erstellen</button><button class="secondary" id="emailForgotButton" type="button">🔑 Passwort vergessen</button><div id="emailAuthMessage" class="message" aria-live="polite"></div><div class="mf-auth-tagline">DIE WELT GEHÖRT DIR</div><div class="foot">Kein Gastmodus · dein Spielstand gehört zu deinem Konto</div>`;
  }
  function gate(){
    let block=document.getElementById('mobileOnlyBlock');
    if(!block){
      block=document.createElement('div');
      block.id='mobileOnlyBlock';
      block.innerHTML='<div class="mobile-block-card"><img src="./assets/mafivera-logo.webp" alt="MAFIVERA"><h1>MAFIVERA ist ein Handygame</h1><p>Dieses Spiel ist für Smartphones mit Touchscreen und GPS entwickelt.</p></div>';
      document.body.appendChild(block);
    }
    const phone=isPhone();
    document.documentElement.classList.toggle('mafivera-phone',phone);
    document.documentElement.classList.toggle('mafivera-desktop',!phone);
    if(phone){block.style.display='none';showPhoneStart();}
    else{block.style.display='flex';}
  }
  const boot=()=>{gate();window.addEventListener('resize',gate,{passive:true});window.addEventListener('orientationchange',()=>setTimeout(gate,100),{passive:true});};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
