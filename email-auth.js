/* MTRW Email Authentication v2 */
(()=>{
  if(window.mtrwEmailAuthInstalled)return;
  window.mtrwEmailAuthInstalled=true;
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  async function boot(){
    for(let i=0;i<100&&!window.db;i++)await wait(100);
    const db=window.db;
    const start=document.getElementById('start');
    const card=start?.querySelector('.card');
    const button=document.getElementById('startButton');
    if(!db||!start||!card||!button)return;
    card.innerHTML=`<div class="logo">🕴️ MAFIA</div><div class="sub">THE REAL WORLD</div><h1 id="emailModeTitle">Willkommen</h1><p id="emailModeText">Melde dich mit deiner E-Mail-Adresse und deinem Passwort an.</p><input id="emailAuthEmail" type="email" autocomplete="email" placeholder="E-Mail-Adresse"><input id="emailAuthPassword" type="password" autocomplete="current-password" placeholder="Passwort"><input id="emailAuthUsername" autocomplete="username" maxlength="24" placeholder="Username (nur bei Registrierung)" hidden><button class="primary" id="emailAuthButton" type="button">🔐 Anmelden</button><button class="secondary" id="emailRegisterButton" type="button">📝 Neues Konto erstellen</button><button class="secondary" id="emailForgotButton" type="button">🔑 Passwort vergessen</button><div id="emailAuthMessage" class="message" aria-live="polite"></div><div class="foot">Keine E-Mail-Bestätigung erforderlich · dein Spielstand gehört zu deinem Konto</div>`;
    const email=document.getElementById('emailAuthEmail');
    const pass=document.getElementById('emailAuthPassword');
    const uname=document.getElementById('emailAuthUsername');
    const action=document.getElementById('emailAuthButton');
    const register=document.getElementById('emailRegisterButton');
    const forgot=document.getElementById('emailForgotButton');
    const title=document.getElementById('emailModeTitle');
    const text=document.getElementById('emailModeText');
    const out=document.getElementById('emailAuthMessage');
    let mode='login';
    const set=(t,err=false)=>{out.textContent=t||'';out.style.color=err?'#f88':'#d1a72c'};
    const validUser=u=>/^[A-Za-z0-9_.-]{3,24}$/.test(u);
    const showLogin=()=>{mode='login';title.textContent='Willkommen zurück';text.textContent='Melde dich mit deiner E-Mail-Adresse und deinem Passwort an.';uname.hidden=true;action.textContent='🔐 Anmelden';register.textContent='📝 Neues Konto erstellen';set('')};
    register.onclick=()=>{if(mode==='login'){mode='register';title.textContent='Konto erstellen';text.textContent='Erstelle dein Konto. Der Username ist dein Name im Spiel.';uname.hidden=false;action.textContent='🚀 Konto erstellen';register.textContent='↩️ Zur Anmeldung';set('')}else showLogin()};
    async function launch(session){
      if(!session){set('Anmeldung erfolgreich, aber keine Sitzung wurde zurückgegeben.',true);return}
      set('Anmeldung erfolgreich. Spiel wird geladen…');
      if(typeof window.startGame==='function'){
        try{await window.startGame(session);return}catch(e){console.error('[MTRW] startGame',e);set('Das Spiel konnte nicht geladen werden: '+(e?.message||e),true);return}
      }
      set('Spielmodul wird noch geladen…');
      const timer=setInterval(async()=>{if(typeof window.startGame==='function'){clearInterval(timer);try{await window.startGame(session)}catch(e){console.error(e);set('Das Spiel konnte nicht geladen werden: '+(e?.message||e),true)}}},100);
      setTimeout(()=>clearInterval(timer),10000);
    }
    action.onclick=async()=>{
      const em=email.value.trim().toLowerCase(),pw=pass.value,un=uname.value.trim();
      if(!em||!pw){set('Bitte E-Mail-Adresse und Passwort eingeben.',true);return}
      if(pw.length<8){set('Das Passwort muss mindestens 8 Zeichen lang sein.',true);return}
      if(mode==='register'&&!validUser(un)){set('Username: 3–24 Zeichen, nur Buchstaben, Zahlen, Punkt, Bindestrich oder Unterstrich.',true);return}
      action.disabled=true;register.disabled=true;forgot.disabled=true;
      try{
        if(mode==='register'){
          const exists=await db.from('profiles').select('id').eq('username',un).maybeSingle();
          if(exists.error)throw exists.error;
          if(exists.data){set('Dieser Username ist bereits vergeben.',true);return}
          set('Konto wird erstellt…');
          const r=await db.auth.signUp({email:em,password:pw,options:{data:{username:un}}});
          if(r.error)throw r.error;
          if(!r.data.session){set('Konto wurde erstellt, aber Supabase liefert keine Sitzung. Prüfe, ob „Confirm email“ wirklich deaktiviert ist.',true);return}
          await launch(r.data.session);
        }else{
          set('Anmeldung wird geprüft…');
          const r=await db.auth.signInWithPassword({email:em,password:pw});
          if(r.error)throw r.error;
          await launch(r.data.session);
        }
      }catch(e){
        const m=String(e?.message||e);
        if(/invalid login credentials/i.test(m))set('E-Mail oder Passwort ist falsch.',true);
        else if(/email not confirmed/i.test(m))set('E-Mail-Bestätigung ist in Supabase noch aktiv. Deaktiviere „Confirm email“.',true);
        else if(/already registered/i.test(m))set('Für diese E-Mail existiert bereits ein Konto. Melde dich an.',true);
        else set(m,true);
      }finally{action.disabled=false;register.disabled=false;forgot.disabled=false}
    };
    forgot.onclick=async()=>{
      const em=email.value.trim().toLowerCase();
      if(!em){set('Bitte zuerst deine E-Mail-Adresse eingeben.',true);return}
      forgot.disabled=true;
      try{
        const r=await db.auth.resetPasswordForEmail(em,{redirectTo:location.origin+location.pathname});
        if(r.error)throw r.error;
        set('Falls ein Konto mit dieser E-Mail existiert, wurde der Passwort-Reset angefordert.');
      }catch(e){set(String(e?.message||e),true)}finally{forgot.disabled=false}
    };
    button.onclick=()=>{};
    showLogin();
  }
  boot();
})();
