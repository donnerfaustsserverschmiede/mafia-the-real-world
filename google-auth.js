/* MTRW Google OAuth entry screen v1.0 */
(()=>{
  if(window.mtrwGoogleAuthInstalled)return;
  window.mtrwGoogleAuthInstalled=true;

  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  const byId=id=>document.getElementById(id);
  const productionUrl='https://donnerfaustsserverschmiede.github.io/mafia-the-real-world/';

  function showMessage(text){
    const el=byId('startMessage');
    if(el)el.textContent=text||'';
  }

  function renderGoogleStart(){
    const start=byId('start');
    const card=start?.querySelector('.card');
    if(!start||!card)return false;

    card.innerHTML=`
      <div class="logo">🕴️ MAFIA</div>
      <div class="sub">THE REAL WORLD</div>
      <h1>Willkommen in der Familie</h1>
      <p>Dein Spielstand wird mit deinem <b>Google-Konto</b> verknüpft. So kannst du dich später auch auf einem anderen Gerät wieder anmelden.</p>
      <button class="primary" id="googleStartButton" type="button">🔵 Mit Google anmelden</button>
      <div id="startMessage" class="message" aria-live="polite"></div>
      <div class="foot">Sicher anmelden · kein eigenes Passwort nötig</div>`;

    const button=byId('googleStartButton');
    if(button)button.onclick=async()=>{
      if(!window.db?.auth){showMessage('Authentifizierung wird noch geladen…');return}
      button.disabled=true;
      button.textContent='🔄 Google wird geöffnet…';
      showMessage('Weiterleitung zu Google…');
      const{error}=await window.db.auth.signInWithOAuth({
        provider:'google',
        options:{redirectTo:productionUrl}
      });
      if(error){
        button.disabled=false;
        button.textContent='🔵 Mit Google anmelden';
        showMessage(error.message||'Google-Anmeldung konnte nicht gestartet werden.');
      }
    };
    return true;
  }

  async function consumeOAuthHash(){
    const hash=window.location.hash?.replace(/^#/,'');
    if(!hash)return false;
    const params=new URLSearchParams(hash);
    const access_token=params.get('access_token');
    const refresh_token=params.get('refresh_token');
    if(!access_token||!refresh_token)return false;
    if(!window.db?.auth)return false;
    showMessage('Google-Anmeldung wird abgeschlossen…');
    const{error}=await window.db.auth.setSession({access_token,refresh_token});
    if(error){showMessage(error.message||'Google-Anmeldung konnte nicht abgeschlossen werden.');return false}
    history.replaceState(null,document.title,window.location.pathname+window.location.search);
    return true;
  }

  async function boot(){
    for(let i=0;i<100;i++){
      if(window.db?.auth&&byId('start'))break;
      await wait(100);
    }
    if(!window.db?.auth)return;

    await consumeOAuthHash();

    const{data}=await window.db.auth.getSession();
    if(!data?.session)renderGoogleStart();

    window.db.auth.onAuthStateChange((event,session)=>{
      if(session&&typeof window.startGame==='function'){
        setTimeout(()=>window.startGame(session),0);
      }
    });
  }
  boot();
})();
