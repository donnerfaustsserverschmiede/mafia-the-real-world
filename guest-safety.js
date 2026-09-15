/* MTRW Guest Profile Safety v1.0 */
(()=>{
  if(window.mtrwGuestSafetyInstalled)return;
  window.mtrwGuestSafetyInstalled=true;
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  const byId=id=>document.getElementById(id);

  async function apply(){
    for(let i=0;i<80;i++){
      const db=window.db;
      const logout=byId('logout');
      const game=byId('game');
      if(db&&logout&&game){
        const {data}=await db.auth.getSession();
        const u=data?.session?.user;
        if(u){
          try{
            localStorage.setItem('mtrw_guest_username',String(u.user_metadata?.username||''));
            localStorage.setItem('mtrw_guest_user_id',String(u.id||''));
          }catch{}
          if(u.is_anonymous){
            logout.disabled=true;
            logout.textContent='🔒 Gastprofil · Abmelden gesperrt';
            logout.title='Bitte zuerst unter ⚙️ Profil eine E-Mail-Adresse verknüpfen und das Profil absichern.';
            logout.setAttribute('aria-label','Abmelden für ungesichertes Gastprofil gesperrt');
            const status=byId('status');
            if(status && !status.textContent)status.textContent='Gastprofil aktiv · Sichere dein Profil unter ⚙️ Profil.';
            const accountType=byId('accountType');
            if(accountType)accountType.textContent='🟡 Gastprofil · Abmelden ist bis zur Absicherung gesperrt, damit dein Spielfortschritt nicht verloren geht.';
          }else{
            logout.disabled=false;
            logout.textContent='Abmelden';
            logout.title='';
          }
        }
        return;
      }
      await wait(250);
    }
  }

  async function boot(){
    await wait(300);
    await apply();
    if(window.db?.auth)window.db.auth.onAuthStateChange(()=>setTimeout(apply,100));
  }
  boot();
})();
