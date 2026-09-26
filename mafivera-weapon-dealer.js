/* MAFIVERA — random hourly weapon dealer */
(()=>{'use strict';
if(window.__mtrwWeaponDealerLoaded)return;window.__mtrwWeaponDealerLoaded=true;
let marker=null,last=null,timer=null;
const db=()=>window.db;
const names={weapon_melee:'Hieb- und Stichwaffen',weapon_handgun:'Handfeuerwaffen',weapon_smg:'Kleine Langwaffen / Maschinenpistolen',weapon_longarm:'Langwaffen'};
const invKeys={weapon_melee:'melee',weapon_handgun:'handguns',weapon_smg:'smgs',weapon_longarm:'longarms'};
function rpc(n,a={}){return db().rpc(n,a).then(r=>{if(r.error)throw r.error;return r.data})}
function toast(t,e=false){const x=document.getElementById('toast');if(x){x.textContent=t;x.className='toast show '+(e?'error':'');clearTimeout(toast.t);toast.t=setTimeout(()=>x.className='toast',2800)}}
function coords(d){const lat=Number(d?.lat),lng=Number(d?.lng);return Number.isFinite(lat)&&Number.isFinite(lng)&&Math.abs(lat)<=90&&Math.abs(lng)<=180?[lat,lng]:null}
function removeMarker(){if(marker){marker.remove();marker=null}}
function center(d){const p=coords(d),m=window.__mtrwMap;if(p&&m)m.setView(p,Math.max(m.getZoom(),17),{animate:false})}
function dismiss(){removeMarker();hideAlert();last=null}
function offer(d){
 const el=document.getElementById('drawer');if(!el)return;
 const offered=Math.max(0,Number(d.remaining||0)),owned=Math.max(0,Number(d.available_inventory||0)),qty=Math.min(offered,owned),price=Math.max(0,Number(d.price||0)),name=names[d.weapon_type]||d.weapon_type||'Waffe';
 document.getElementById('drawerTitle').textContent='Waffenhändler';
 document.getElementById('drawerBody').innerHTML=`<div class="dealer-offer"><div class="dealer-big">🏭</div><h3>Waffenhändler-Angebot</h3><p>Ich kaufe bis zu <b>${qty}× ${name}</b> für <b>${(qty*price).toLocaleString('de-DE')} $</b>.</p><p class="hint">${price.toLocaleString('de-DE')} $ pro Stück · Händlerbestand: ${offered} · Dein Bestand: ${owned}</p>${qty<1?`<p class="hint" style="color:#ffb18c">Du hast keine passende ${name} im Waffeninventar.</p>`:''}<button id="weaponDealerAccept" class="action primary" ${qty<1?'disabled':''}>✅ ${qty>0?'Waffen verkaufen':'Keine passenden Waffen vorhanden'}</button><button id="weaponDealerReject" class="action">❌ Angebot ablehnen</button></div>`;
 el.classList.remove('hidden');
 document.getElementById('weaponDealerAccept').onclick=async()=>{try{const result=await rpc('mtrw_sell_weapon_to_dealer',{p_spawn_id:d.id,p_weapon_type:d.weapon_type,p_quantity:qty});if(result?.money!=null){const hud=document.getElementById('hudMoney');if(hud)hud.textContent=Number(result.money).toLocaleString('de-DE');window.__mtrwWeaponDealerLastSale=result;document.dispatchEvent(new CustomEvent('mtrw:balance-updated',{detail:result}))}dismiss();el.classList.add('hidden');toast(`Verkauft. +${Number(result?.earned||qty*price).toLocaleString('de-DE')} $ gutgeschrieben.`)}catch(e){const msg=String(e?.message||''); const friendly=msg.includes('not_enough_weapons')?'Du hast nicht genug passende Waffen im Inventar.':msg.includes('weapon_dealer_too_far')?'Du bist zu weit vom Waffenhändler entfernt.':msg.includes('weapon_dealer_left')?'Der Waffenhändler ist bereits wieder weg.':msg.includes('invalid_weapon_offer')?'Dieses Angebot ist nicht mehr gültig.':'Waffenverkauf fehlgeschlagen.'; toast(friendly,true)}};
 document.getElementById('weaponDealerReject').onclick=()=>{dismiss();el.classList.add('hidden');toast('Angebot abgelehnt. Der Waffenhändler kommt später wieder.')};
}
function ensurePane(m){if(!m||!m.createPane)return;let p=m.getPane('mtrwEventPane');if(!p){p=m.createPane('mtrwEventPane');p.style.zIndex='1200';p.style.pointerEvents='none'}}
function draw(d){
 const m=window.__mtrwMap,p=coords(d);if(!m||!p)return;ensurePane(m);
 if(marker&&last?.id===d.id){marker.setLatLng(p);return}
 removeMarker();
 marker=L.marker(p,{pane:'mtrwEventPane',interactive:true,zIndexOffset:200001,icon:L.divIcon({className:'mtrw-weapon-dealer-marker',html:'<div class="mtrw-weapon-dealer-pin">🔫</div><div class="mtrw-weapon-dealer-label">WAFFENHÄNDLER</div>',iconSize:[180,82],iconAnchor:[90,41]})}).addTo(m);
 marker.setZIndexOffset(100001);
 marker.bindTooltip('🏭 Waffenhändler – Angebot öffnen',{direction:'top',offset:[0,-30],sticky:true});
 marker.on('click',e=>{L.DomEvent.stopPropagation(e);offer(d)});
 last=d;
}
async function tick(){
 try{
  const m=window.__mtrwMap;if(!db()||!m)return;
  const d=await rpc('mtrw_weapon_dealer_state');
  if(d?.active){last=d;draw(d)}else{removeMarker();last=null}
 }catch(e){}
}
function boot(){if(timer)return;tick();timer=setInterval(tick,5000);window.addEventListener('mtrw:location-updated',tick)}
const s=document.createElement('style');s.textContent='.mtrw-weapon-dealer-marker,.mtrw-weapon-dealer-marker.leaflet-marker-icon{display:flex!important;visibility:visible!important;opacity:1!important;background:transparent!important;border:0!important;pointer-events:auto!important;width:180px!important;height:82px!important;z-index:100001!important}.mtrw-weapon-dealer-pin{font-size:40px;line-height:40px;text-align:center;filter:drop-shadow(0 3px 5px #000)}.mtrw-weapon-dealer-label{margin:auto;width:max-content;background:#171b22f5;color:#f08a5d;border:2px solid #d86b3c;border-radius:8px;padding:2px 8px;font:900 10px/13px system-ui,sans-serif;box-shadow:0 3px 9px #000}.dealer-offer{text-align:center;padding:14px}.dealer-offer .action{margin-top:8px}#weaponDealerAlert{position:fixed!important;left:8px!important;right:auto!important;top:calc(50% + 42px)!important;transform:translateY(-50%)!important;z-index:100000!important;border:2px solid #d86b3c!important;border-radius:12px!important;background:#111722f5!important;color:#ffb18c!important;padding:10px 13px!important;font:900 12px/16px system-ui,sans-serif!important;box-shadow:0 8px 24px #000b!important;cursor:pointer!important}';
document.head.appendChild(s);
const wait=setInterval(()=>{if(window.db&&window.__mtrwMap){clearInterval(wait);boot()}},250);setTimeout(()=>clearInterval(wait),30000);window.addEventListener('beforeunload',()=>window.removeEventListener('mtrw:location-updated',tick));
})();