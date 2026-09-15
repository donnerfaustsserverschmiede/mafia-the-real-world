/* MTRW GPS v1.0 - request and use the device's real geolocation. */
(()=>{
  if(window.mtrwGpsInstalled)return;
  window.mtrwGpsInstalled=true;
  const game=document.getElementById('game');
  const button=document.getElementById('locate');
  const status=document.getElementById('status');
  const setStatus=t=>{if(status)status.textContent=t};
  const originalLocate=window.locate;
  let requested=false;

  function errorText(e){
    if(!e)return'Unbekannter GPS-Fehler.';
    if(e.code===1)return'Standortzugriff verweigert. Bitte im Browser für diese Website den Standort erlauben und möglichst „Genauen Standort“ aktivieren.';
    if(e.code===2)return'Der Gerätestandort konnte nicht ermittelt werden. Prüfe GPS/Standortdienste und versuche es erneut.';
    if(e.code===3)return'Die GPS-Ermittlung dauert zu lange. Bitte prüfe die Standortdienste und versuche es erneut.';
    return e.message||'GPS-Fehler.';
  }

  function requestRealLocation(){
    if(!navigator.geolocation){setStatus('Dieser Browser unterstützt keinen Gerätestandort.');return;}
    if(typeof originalLocate!=='function'){setStatus('GPS-Modul konnte nicht gestartet werden.');return;}
    setStatus('📍 Originaler Gerätestandort wird angefordert…');
    navigator.geolocation.getCurrentPosition(pos=>{
      const a=Math.round(pos.coords.accuracy||0);
      setStatus(`📍 Gerätestandort aktiv · Genauigkeit ca. ${a} m`);
      originalLocate();
    },e=>setStatus(errorText(e)),{
      enableHighAccuracy:true,
      maximumAge:0,
      timeout:20000
    });
  }

  async function checkPermission(){
    try{
      if(!navigator.permissions?.query)return'unknown';
      const p=await navigator.permissions.query({name:'geolocation'});
      if(p.state==='denied')setStatus('📍 Standort ist blockiert. Bitte Standortberechtigung für MAFIA – The Real World im Browser freigeben.');
      return p.state;
    }catch{return'unknown'}
  }

  if(button)button.onclick=requestRealLocation;

  async function startWhenGameVisible(){
    if(requested)return;
    if(!game||game.hidden)return;
    requested=true;
    const permission=await checkPermission();
    if(permission!=='denied')requestRealLocation();
  }

  if(game){
    const observer=new MutationObserver(startWhenGameVisible);
    observer.observe(game,{attributes:true,attributeFilter:['hidden']});
    setTimeout(startWhenGameVisible,700);
  }
})();
