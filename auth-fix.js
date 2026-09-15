/* MTRW auth hardening. Loaded before the main app. */
(function(){
  if(!window.supabase){
    document.write('<script src="https://unpkg.com/@supabase/supabase-js@2"><\\/script>');
  }
  function init(){
    const form=document.getElementById('authForm');
    const submit=document.getElementById('authSubmit');
    const message=document.getElementById('authMessage');
    const email=document.getElementById('email');
    const password=document.getElementById('password');
    if(!form||!submit||!message)return;
    const url='https://ufqdntsxgqcxtszufbtv.supabase.co';
    const key='sb_publishable_PDao9J9Pz87uSotESNeGbg_GSGh5u49';
    if(!window.db && window.supabase) window.db=window.supabase.createClient(url,key);
    if(!window.db){message.textContent='Anmeldung konnte nicht geladen werden. Bitte Seite neu laden.';return;}
    form.onsubmit=null;
    form.addEventListener('submit',async function(e){
      e.preventDefault();
      e.stopPropagation();
      submit.disabled=true;
      submit.textContent='Anmeldung läuft…';
      message.textContent='';
      try{
        const em=(email.value||'').trim().toLowerCase();
        const pw=password.value||'';
        if(!em||!pw)throw new Error('Bitte E-Mail-Adresse und Passwort eingeben.');
        const {data,error}=await window.db.auth.signInWithPassword({email:em,password:pw});
        if(error)throw error;
        if(!data.session)throw new Error('Anmeldung wurde nicht bestätigt.');
        message.textContent='Anmeldung erfolgreich. Spiel wird geladen…';
        if(typeof window.startGame==='function') await window.startGame(data.session);
        else location.reload();
      }catch(err){
        const m=String(err?.message||err||'Unbekannter Fehler');
        message.textContent=m.toLowerCase().includes('invalid login credentials')?'E-Mail oder Passwort ist falsch.':m;
      }finally{
        submit.disabled=false;
        submit.textContent='Anmelden';
      }
    },true);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
// deployment trigger 2026-09-15
