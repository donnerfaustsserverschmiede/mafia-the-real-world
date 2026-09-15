/* MTRW authentication compatibility layer.
   Owns the LOGIN submit event in capture phase so the legacy inline handler
   cannot race Supabase initialization/session recovery on mobile browsers.
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
    if(!form||!window.db)return false;
    installed=true;
    form.addEventListener('submit',async e=>{
      if(el('registerTab')?.classList.contains('active'))return;
      e.preventDefault();e.stopImmediatePropagation();
      const button=el('authSubmit'),email=el('email'),password=el('password');
      if(button)button.disabled=true;
      message('Anmeldung wird geprüft…');
      try{
        if(window.db.auth.initialize)await withTimeout(window.db.auth.initialize(),8000,'Supabase Auth konnte nicht initialisiert werden. Bitte Seite neu laden.');
        const em=(email?.value||'').trim().toLowerCase(),pw=password?.value||'';
        if(!em||!pw)throw new Error('Bitte E-Mail und Passwort eingeben.');
        const result=await withTimeout(window.db.auth.signInWithPassword({email:em,password:pw}),15000,'Die Anmeldung antwortet nicht. Bitte Seite neu laden und erneut versuchen.');
        if(result.error)throw result.error;
        if(!result.data?.session)throw new Error('Supabase hat keine Sitzung zurückgegeben.');
        message('Anmeldung erfolgreich. Spiel wird geladen…');
        await new Promise(r=>setTimeout(r,0));
        if(typeof window.startGame!=='function')throw new Error('Spielstart konnte nicht gefunden werden.');
        await window.startGame(result.data.session);
      }catch(err){
        console.error('[MTRW AUTH]',err);
        const raw=String(err?.message||err||'Unbekannter Fehler.'),low=raw.toLowerCase();
        message(low.includes('invalid login credentials')?'E-Mail oder Passwort ist falsch.':low.includes('email not confirmed')?'Die E-Mail ist noch nicht bestätigt. Bitte „Confirm email“ in Supabase deaktivieren.':raw);
      }finally{if(button)button.disabled=false}
    },true);
    return true;
  }
  async function boot(){for(let i=0;i<100&&!installed;i++){if(await install())break;await wait(100)}if(!installed)console.error('[MTRW AUTH] Login-Fix konnte nicht installiert werden.');}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
// deployment trigger 2026-09-15-login-deadlock-fix-v4-final