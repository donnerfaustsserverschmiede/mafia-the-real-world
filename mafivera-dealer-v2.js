/* MAFIVERA V2 — dealer marker, persistent during active offer, dismissible per slot */
(()=>{'use strict';
if(window.__mtrwDealerV2Loaded)return;window.__mtrwDealerV2Loaded=true;
let marker=null,last=null,timer=null;
const db=()=>window.db,DISMISS_KEY='mtrw_dealer_dismissed_until';
async function rpc(n,a={}){const r=await db().rpc(n,a);if(r.error)throw r.error;return r.data}
const names={cocaine:'Kokain',weed:'Cannabis',meth:'Meth',heroin:'Heroin'};
function toast(t,e=false){const x=document.getElementById('toast');if(x){x.textContent=t;x.className='toast show '+(e?'error':'');clearTimeout(toast.t);toast.t=setTimeout(()=>x.className='toast',2800)}}
function coords(d){const lat=Number(d?.lat??d?.latitude??d?.gps_lat),lng=Number(d?.lng??d?.longitude??d?.gps_lng);return Number.isFinite(lat)&&Number.isFinite(lng)&&Math.abs(lat)<=90&&Math.abs(lng)<=180?[lat,lng]:null}
function dismissUntil(d){const u=Date.parse(d?.active_until||'');return Number.isFinite(u)?u:Date.now()+600000}
function isDismissed(d){try{return Number(localStorage.getItem(DISMISS_KEY)||0)>Date.now()&&localStorage.getItem(DISMISS_KEY+'|id')===String(d?.id||'')}catch(e){return false}}
function dismissCurrent(d){try{localStorage.setItem(DISMISS_KEY,String(dismissUntil(d)));localStorage.setItem(DISMISS_KEY+'|id',String(d.id||''))}catch(e){}removeMarker();last=null}
function removeMarker(){if(marker){marker.remove();marker=null}}
function center(d){const p=coords(d),m=window.__mtrwMap;if(!p||!m)return;m.setView(p,Math.max(m.getZoom(),17),{animate:false})}
function offer(d){const el=document.getElementById('drawer');if(!el)return;const qty=Math.max(0,Number(d.remaining||0)),price=Math.max(0,Number(d.price||0));document.getElementById('drawerTitle').textContent='Dealer';document.getElementById('drawerBody').innerHTML=`<div class="dealer-offer"><div class="dealer-big">🕴️</div><h3>Dealer-Angebot</h3><p>Ich kaufe <b>${qty}× ${names[d.drug_type]||d.drug_type||'Ware'}</b> für <b>${(qty*price).toLocaleString('de-DE')} $</b>.</p><p class="hint">${price.toLocaleString('de-DE')} $ pro Stück · ${qty} Stück verfügbar</p><button id="dealerAccept" class="action primary">✅ Verkaufen</button><button id="dealerReject" class="action">❌ Angebot ablehnen</button></div>`;el.classList.remove('hidden');document.getElementById('dealerAccept').onclick=async()=>{try{const result=await rpc('mtrw_sell_to_dealer',{p_spawn_id:d.id,p_drug_type:d.drug_type,p_quantity:qty});if(result?.money!=null){window.__mtrwDealerLastSale={money:Number(result.money),earned:Number(result.earned||0),sold:Number(result.sold||qty)};document.dispatchEvent(new CustomEvent('mtrw:balance-updated',{detail:window.__mtrwDealerLastSale}));const hud=document.getElementById('hudMoney');if(hud)hud.textContent=Number(result.money).toLocaleString('de-DE')}dismissCurrent(d);el.classList.add('hidden');toast(`Verkauft. +${Number(result?.earned||qty*price).toLocaleString('de-DE')} $ gutgeschrieben.`)}catch(e){toast(e.message||'Handel fehlgeschlagen.',true)}};document.getElementById('dealerReject').onclick=()=>{dismissCurrent(d);el.classList.add('hidden');toast('Angebot abgelehnt. Der Dealer kommt zur nächsten Viertelstunde wieder.')}}
)();
