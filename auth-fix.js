/* MTRW authentication compatibility layer.
   The Supabase client initializes Auth automatically during construction.
   Do not call auth.initialize() again from the login button: on mobile this
   can wait on the same Auth lock and leave the UI at "Anmeldung wird geprüft".
*/
(function(){
  let installed=false;
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  const el=id=>document.getElementById(id);
  const message=t=>{const n=el('authMessage');if(n)n.textContent=t||''};
  const withTimeout=(promise,ms,label)=>Promise.race([promise,new Promise((_,reject)=>setTimeout(()=>reject(new Error(label)),ms))]);
  async function install(){
    if(installed)return true;
    const form=el('authForm');
    if(!form||!window.db||!window.db.auth)return false;
    installed=true;
    form.addEventListener('submit',async e=>{
      if(el('registerTab')?.classList.contains('active'))return;
      e.preventDefault();
      e.stopImmediatePropagation();
      const button=el('authSubmit'),email=el('email'),password=el('password');
      if(button)button.disabled=true;
      try{
        const em=(email?.value||'').trim().toLowerCase(),pw=password?.value||'';
        if(!em||!pw)throw new Error('Bitte E-Mail und Passwort eingeben.');
        message('Anmeldung wird geprüft…');
        const result=await withTimeout(
          window.db.auth.signInWithPassword({email:em,password:pw}),
          15000,
          'Die Anmeldung antwortet nicht. Bitte Seite neu laden und erneut versuchen.'
        );
        if(result.error)throw result.error;
        if(!result.data?.session)throw new Error('Supabase hat keine Sitzung zurückgegeben.');
        message('Anmeldung erfolgreich · Spiel wird geladen…');
        if(typeof window.startGame!=='function')throw new Error('Spielstart konnte nicht gefunden werden.');
        await withTimeout(
          window.startGame(result.data.session),
          20000,
          'Die Anmeldung war erfolgreich, aber das Spiel konnte nicht gestartet werden. Bitte Seite neu laden.'
        );
      }catch(err){
        console.error('[MTRW AUTH]',err);
        const raw=String(err?.message||err||'Unbekannter Fehler.'),low=raw.toLowerCase();
        message(
          low.includes('invalid login credentials')?'E-Mail oder Passwort ist falsch.':
          low.includes('email not confirmed')?'Die E-Mail ist noch nicht bestätigt. Bitte „Confirm email“ in Supabase deaktivieren.':
          raw
        );
      }finally{if(button)button.disabled=false}
    },true);
    return true;
  }
  async function boot(){
    for(let i=0;i<100&&!installed;i++){
      if(await install())break;
      await wait(100);
    }
    if(!installed)console.error('[MTRW AUTH] Login-Fix konnte nicht installiert werden.');
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
// deployment trigger 2026-09-15-login-deadlock-fix-v5