/* MAFIVERA V2 — dealer marker, persistent during active offer, dismissible per slot */
(()=>{'use strict';
if(window.__mtrwDealerV2Loaded)return;window.__mtrwDealerV2Loaded=true;
let marker=null,last=null,alertEl=null,timer=null;
const db=()=>window.db,DISMISS_KEY='mtrw_dealer_dismissed_until';
async function rpc(n,a={}){const r=await db().rpc(n,a);if(r.error)throw r.error;return r.data}
const names={cocaine:'Kokain',weed:'Cannabis',meth:'Meth',heroin:'Heroin'};
function hideAlert(){const a=document.getElementById('dealerAlert');if(a)a.remove();const w=document.getElementById('weaponDealerAlert');if(w)w.remove()}
function toast(t,e=false){const x=document.getElementById('toast');if(x){x.textContent=t;x.className='toast show '+(e?'error':'');clearTimeout(toast.t);toast.t=setTimeout(()=>x.className='toast',2800)}}
function coords(d){const lat=Number(d?.lat??d?.latitude??d?.gps_lat),lng=Number(d?.lng??d?.longitude??d?.gps_lng);return Number.isFinite(lat)&&Number.isFinite(lng)&&Math.abs(lat)<=90&&Math.abs(lng)<=180?[lat,lng]:null}
function dismissUntil(d){const u=Date.parse(d?.active_until||'');return Number.isFinite(u)?u:Date.now()+600000}
function isDismissed(d){try{return Number(localStorage.getItem(DISMISS_KEY)||0)>Date.now()&&localStorage.getItem(DISMISS_KEY+'|id')===String(d?.id||'')}catch(e){return false}}
function dismissCurrent(d){try{localStorage.setItem(DISMISS_KEY,String(dismissUntil(d)));localStorage.setItem(DISMISS_KEY+'|id',String(d.id||''))}catch(e){}removeMarker();hideAlert();last=null}
function removeMarker(){if(marker){marker.remove();marker=null}}
function center(d){const p=coords(d),m=window.__mtrwMap;if(!p||!m)return;m.setView(p,Math.max(m.getZoom(),17),{animate:false})}
async function offer(d){
 const el=document.getElementById('drawer');if(!el)return;
 const dealerQty=Math.max(0,Number(d.remaining||0)),price=Math.max(0,Number(d.price||0));
 let ownQty=0;
 try{const inv=await rpc('mafivera_inventory');ownQty=Math.max(0,Number((inv?.items||[]).find(x=>String(x?.drug_type)===String(d.drug_type))?.quantity||0));}catch(_){}
 const qty=Math.min(dealerQty,ownQty);
 document.getElementById('drawerTitle').textContent='Dealer';
 document.getElementById('drawerBody').innerHTML=`<div class="dealer-offer"><div class="dealer-big">🕴️</div><h3>Dealer-Angebot</h3><p>Ich kaufe <b>bis zu ${dealerQty}× ${names[d.drug_type]||d.drug_type||'Ware'}</b> für <b>${price.toLocaleString('de-DE')} $ pro Stück</b>.</p><p class="hint">Du hast <b>${ownQty}</b> Stück · maximal verkaufbar: <b>${qty}</b></p><label style="display:block;margin:10px 0 5px;font-weight:800">Menge</label><input id="dealerQty" type="number" min="1" max="${qty}" value="${qty}" style="width:100%;box-sizing:border-box;padding:10px;border-radius:9px;background:#0b0f16;color:#fff;border:1px solid #475569"><button id="dealerAccept" class="action primary" ${qty<1?'disabled':''}>✅ Verkaufen</button><button id="dealerReject" class="action">❌ Angebot ablehnen</button></div>`;
 el.classList.remove('hidden');
 document.getElementById('dealerAccept').onclick=async()=>{
   const sell=Math.floor(Number(document.getElementById('dealerQty')?.value||0));
   if(!Number.isInteger(sell)||sell<1||sell>qty){toast('Bitte eine gültige Verkaufsmenge eingeben.',true);return}
   try{const result=await rpc('mtrw_sell_to_dealer',{p_spawn_id:d.id,p_drug_type:d.drug_type,p_quantity:sell});
     if(result?.money!=null){window.__mtrwDealerLastSale={money:Number(result.money),earned:Number(result.earned||0),sold:Number(result.sold||sell)};document.dispatchEvent(new CustomEvent('mtrw:balance-updated',{detail:window.__mtrwDealerLastSale}));const hud=document.getElementById('hudMoney');if(hud)hud.textContent=Number(result.money).toLocaleString('de-DE')}
     dismissCurrent(d);el.classList.add('hidden');toast(`Verkauft: ${Number(result?.sold||sell).toLocaleString('de-DE')} Stück · +${Number(result?.earned||sell*price).toLocaleString('de-DE')} $ gutgeschrieben.`);
   }catch(e){toast(e.message||'Handel fehlgeschlagen.',true)}
 };
 document.getElementById('dealerReject').onclick=()=>{dismissCurrent(d);el.classList.add('hidden');toast('Angebot abgelehnt. Der Dealer kommt zur nächsten Viertelstunde wieder.')};
}
function ensurePane(m){
 if(!m||!m.createPane)return;
 let p=m.getPane('mtrwDealerPane');
 if(!p){p=m.createPane('mtrwDealerPane');p.style.zIndex='1200';p.style.pointerEvents='auto'}
}
function draw(d){const m=window.__mtrwMap,p=coords(d);if(!m||!p)return;ensurePane(m);const same=marker&&last?.id===d.id;if(same){marker.setLatLng(p);marker.setZIndexOffset(300000);return}removeMarker();marker=L.marker(p,{pane:'mtrwDealerPane',interactive:true,zIndexOffset:300000,keyboard:true,opacity:1,icon:L.divIcon({className:'mtrw-dealer-marker-v4',html:'<div class="mtrw-dealer-pin">🕴️</div><div class="mtrw-dealer-label">DEALER</div>',iconSize:[150,78],iconAnchor:[75,39]})}).addTo(m);marker.setZIndexOffset(100000);marker.bindTooltip('🕴️ Dealer – Angebot öffnen',{direction:'top',offset:[0,-30],sticky:true});marker.on('click',e=>{L.DomEvent.stopPropagation(e);offer(d)});last=d}
async function tick(){try{const m=window.__mtrwMap;if(!db()||!m)return;const d=await rpc('mtrw_dealer_state');if(d?.active){if(isDismissed(d)){removeMarker();hideAlert();return}last=d;draw(d);ensureAlert(d)}else{removeMarker();hideAlert();last=null}}catch(e){/* retain last valid marker on transient errors */}}
function boot(){if(timer)return;tick();timer=setInterval(tick,5000);window.__mtrwDealerV2Timer=timer}
const s=document.createElement('style');s.id='mtrwDealerV5CSS';s.textContent='.mtrwDealerPane{pointer-events:auto!important}.mtrw-dealer-marker-v4,.mtrw-dealer-marker-v4.leaflet-marker-icon{display:flex!important;visibility:visible!important;opacity:1!important;background:transparent!important;border:0!important;pointer-events:auto!important;width:150px!important;height:78px!important;z-index:100000!important}.mtrw-dealer-pin{font-size:42px;line-height:42px;text-align:center;filter:drop-shadow(0 3px 5px #000)}.mtrw-dealer-label{margin:auto;width:max-content;background:#171b22f5;color:#f2c14e;border:2px solid #d6a52f;border-radius:8px;padding:2px 9px;font:900 11px/14px system-ui,sans-serif;box-shadow:0 3px 9px #000}.dealer-offer{text-align:center;padding:14px}.dealer-big{font-size:60px}.dealer-offer .action{margin-top:8px}#dealerAlert{position:fixed!important;left:50%!important;right:auto!important;top:94px!important;transform:translateX(-50%)!important;width:min(390px,calc(100vw - 110px))!important;max-width:390px!important;white-space:nowrap!important;text-align:center!important;z-index:100000!important;border:2px solid #d6a52f!important;border-radius:12px!important;background:#111722f5!important;color:#f2c14e!important;padding:10px 13px!important;font:900 12px/16px system-ui,sans-serif!important;box-shadow:0 8px 24px #000b!important;cursor:pointer!important}';document.head.appendChild(s);
const wait=setInterval(()=>{if(window.db&&window.__mtrwMap){clearInterval(wait);boot()}},250);setTimeout(()=>clearInterval(wait),30000);
})();
