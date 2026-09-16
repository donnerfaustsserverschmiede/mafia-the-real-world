/* MAFIVERA — phone-only runtime */
(()=>{
  const isPhone=()=>window.matchMedia('(max-width: 768px) and (pointer: coarse)').matches || /Android|iPhone|iPod|Windows Phone/i.test(navigator.userAgent);
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
    block.style.display=phone?'none':'flex';
    /* Die Anmeldung wird ausschließlich von email-auth.js aufgebaut. */
  }
  const boot=()=>{gate();window.addEventListener('resize',gate,{passive:true});window.addEventListener('orientationchange',()=>setTimeout(gate,100),{passive:true});};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
