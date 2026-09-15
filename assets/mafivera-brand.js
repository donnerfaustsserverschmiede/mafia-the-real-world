/* MAFIVERA visual identity */
(()=>{
  const NAME='MAFIVERA', TAG='DIE WELT GEHÖRT DIR', LOGO='./assets/mafivera-logo.png';
  function addHead(){
    document.title=NAME+' – '+TAG;
    const head=document.head;
    [['icon','./assets/favicon-64.png','favicon'],['apple-touch-icon','./assets/apple-touch-icon.png','apple'],['manifest','./manifest.webmanifest','manifest']].forEach(([rel,href,key])=>{
      if(!head.querySelector('link[data-mafivera="'+key+'"]')){const l=document.createElement('link');l.rel=rel;l.href=href;l.dataset.mafivera=key;head.appendChild(l)}
    });
  }
  const image=(cls,alt)=>{const i=document.createElement('img');i.src=LOGO;i.alt=alt;i.className=cls;i.decoding='async';return i};
  function apply(){
    addHead();
    document.querySelectorAll('.logo').forEach(el=>{if(el.dataset.mafivera)return;el.dataset.mafivera='1';el.textContent='';el.appendChild(image('mf-login-logo',NAME))});
    document.querySelectorAll('.brand').forEach(el=>{if(el.dataset.mafivera)return;el.dataset.mafivera='1';el.textContent='';el.appendChild(image('mf-header-logo',NAME));const box=document.createElement('span');box.className='mf-header-text';box.innerHTML='<b>'+NAME+'</b><small>'+TAG+'</small>';el.appendChild(box)});
  }
  const style=document.createElement('style');style.textContent=`
:root{--mf-gold:#d7aa4a;--mf-gold2:#f0cc78;--mf-red:#7d1721}
body{background:#080808;color:#f5f0e7;font-family:Georgia,'Times New Roman',serif}
.top{background:linear-gradient(90deg,#080808,#17120e,#080808);border-bottom:1px solid #5f4827;padding:7px 12px}
.brand{display:flex;align-items:center;gap:9px;font-family:Georgia,'Times New Roman',serif;letter-spacing:.08em;color:var(--mf-gold)}
.mf-header-logo{width:43px;height:43px;border-radius:50%;object-fit:cover;border:1px solid var(--mf-gold);box-shadow:0 0 14px #000}
.mf-header-text{display:flex;flex-direction:column}.mf-header-text b{font-size:18px;line-height:1}.mf-header-text small{font-size:8px;letter-spacing:.14em;color:#bcae98;margin-top:4px}
.card,.panel,.admin-card,.settings-card{background:linear-gradient(145deg,rgba(20,17,15,.98),rgba(8,8,8,.98));border-color:#624b2b;box-shadow:0 20px 70px #000c,inset 0 0 0 1px #2b2115}
.start{background:radial-gradient(circle at 50% 18%,#3a2814 0,#140e0a 28%,#080808 72%)}
.card{border-radius:8px;max-width:470px;padding:18px 20px}.logo{display:flex;justify-content:center;align-items:center;margin:-2px auto 8px}.mf-login-logo{width:min(300px,78vw);height:min(300px,78vw);object-fit:contain;filter:drop-shadow(0 8px 18px #000)}.sub{display:none}
.card h1,.panel h2,.settings-card h2{font-family:Georgia,'Times New Roman',serif;color:var(--mf-gold2);letter-spacing:.04em}
.card input,.settings-card input,.admin-search{background:#080808;border-color:#554127;border-radius:6px;font-family:system-ui,sans-serif}.card input:focus,.settings-card input:focus,.admin-search:focus{border-color:var(--mf-gold)}
button{border-radius:6px;font-family:system-ui,sans-serif;letter-spacing:.03em}.primary{background:linear-gradient(180deg,#e4bb5c,#a97820);color:#100c07;border:1px solid #f0d68c;box-shadow:0 4px 16px #0008}.secondary{background:#211c18;border:1px solid #554127;color:#e8dfd2}.danger{background:#55141b;border:1px solid #8e2b35}.panel{border-radius:9px}.status{color:#c7b99f}
.leaflet-control-attribution{background:#090909dd!important;color:#aaa!important}.leaflet-control-attribution a{color:#d7aa4a!important}
`;
  document.head.appendChild(style);apply();new MutationObserver(apply).observe(document.documentElement,{subtree:true,childList:true});
})();
