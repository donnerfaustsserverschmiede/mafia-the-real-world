/* MAFIVERA V1 — building & gang-hideout systems */
(()=>{'use strict';
const BUILDINGS={
 warehouse:{name:'Lagerhaus',icon:'📦',cost:800,desc:'+50% Materialproduktion auf diesem Feld.',yield:{material:1.5}},
 money:{name:'Geldwäsche',icon:'💵',cost:1200,desc:'+50% Geldproduktion auf diesem Feld.',yield:{money:1.5}},
 club:{name:'Clubhaus',icon:'🥃',cost:1000,desc:'+50% Ruhmproduktion auf diesem Feld.',yield:{reputation:1.5}},
 lab:{name:'Chemielabor',icon:'⚗️',cost:1800,desc:'Verarbeitet automatisch 5 Material zu 1 Produkt pro Minute.',product:true},
 market:{name:'Schwarzmarkt',icon:'🕶️',cost:2200,desc:'+25% Verkaufspreis für Produkte.',sale:1.25},
 watch:{name:'Wachposten',icon:'🛡️',cost:1500,desc:'Schützt dieses und angrenzende Felder (Radius 1) mit +25%.',defense:.25,radius:1},
 hideout:{name:'Gangversteck',icon:'🏚️',cost:2500,desc:'Lagert bis zu 10 Truppen und schützt Radius 2 – auch diagonal – mit +75%.',defense:.75,radius:2,capacity:10}
};
const wait=fn=>{let n=0;const t=()=>{if(window.db)return fn();if(++n<100)setTimeout(t,100)};t()};
wait(async()=>{
 const {data}=await window.db.auth.getSession();const user=data?.session?.user;if(!user)return;
 const key='mafivera:v1:save:'+user.id;
 const read=()=>{try{return JSON.parse(localStorage.getItem(key)||'{}')}catch(e){return {}}};
 const write=s=>{try{localStorage.setItem(key,JSON.stringify(s))}catch(e){}};
 const fmt=n=>Number(n||0).toLocaleString('de-DE');
 const toast=t=>{const e=document.getElementById('toast');if(!e)return;e.textContent=t;e.classList.add('show');clearTimeout(e._t);e._t=setTimeout(()=>e.classList.remove('show'),2600)};
 const cell=id=>{const m=/^g_(-?\d+)_(-?\d+)$/.exec(id);if(!m)return null;return{id,row:+m[1],col:+m[2]}};
 const dist=(a,b)=>Math.max(Math.abs(a.row-b.row),Math.abs(a.col-b.col));
 const protection=id=>{const t=cell(id);if(!t)return[];const s=read(),out=[];Object.entries(s.built||{}).forEach(([bid,b])=>{const d=BUILDINGS[b?.type],c=cell(bid);if(!d?.defense||!c||!(s.fields||{})[bid])return;const delta=dist(c,t);if(delta<=d.radius)out.push({id:bid,building:d,type:b.type,bonus:d.defense,distance:delta,troops:b.troops||0})});return out};
 const defense=id=>protection(id).reduce((n,x)=>n+x.bonus,0);
 window.MAFIVERA_BUILDINGS=BUILDINGS;window.mtrwDefense=id=>defense(id);
 const setCurrent=id=>{window.__mtrwBuildingCell=id;setTimeout(()=>decorate(id),50)};
 const original=window.mtrwClaim;
 const wrap=()=>{if(typeof window.mtrwClaim!=='function'||window.mtrwClaim.__buildingWrapped)return;const fn=window.mtrwClaim;const w=id=>{setCurrent(id);return fn(id)};w.__buildingWrapped=true;window.mtrwClaim=w};
 const buildingPanel=id=>{
  const s=read(),b=(s.built||{})[id],body=document.getElementById('drawerBody');if(!body)return;window.__mtrwBuildingCell=id;
  if(b){const d=BUILDINGS[b.type];body.innerHTML=`<div class="panel-hero">${d.icon} <div><b>${d.name}</b><p>${d.desc}<br>Stufe ${b.level||1}${b.type==='hideout'?` · ${b.troops||0}/${b.capacity||10} Truppen`:''}</p></div></div>${b.type==='hideout'?'<button class="panel-action" data-baction="station">🪖 Truppen stationieren</button>':''}<button class="panel-action danger" data-baction="remove">🏚️ Gebäude abreißen · 50% Erstattung</button><button class="panel-action" data-baction="back">← Zurück zum Grundstück</button>`}
  else{body.innerHTML=`<h3>Gebäude errichten</h3><p class="muted">Ein Gebäude pro Feld. Produktionsgebäude wirken dauerhaft; Schutzgebäude wirken auf Nachbarfelder.</p>${Object.entries(BUILDINGS).map(([k,d])=>`<button class="panel-action" data-build="${k}">${d.icon} <b>${d.name}</b> · ${fmt(d.cost)} $<br><small>${d.desc}</small></button>`).join('')}`}
  body.querySelectorAll('[data-build]').forEach(btn=>btn.onclick=()=>{const type=btn.dataset.build,d=BUILDINGS[type],st=read();st.built=st.built||{};if(st.built[id])return toast('Auf diesem Feld steht bereits ein Gebäude.');if(Number(st.money||0)<d.cost)return toast(`Du brauchst ${fmt(d.cost)} $.`);st.money-=d.cost;st.built[id]={type,level:1,troops:0,capacity:d.capacity||0};write(st);document.getElementById('money').textContent=fmt(st.money);decorate(id);toast(`${d.icon} ${d.name} gebaut.`);buildingPanel(id)});
  body.querySelectorAll('[data-baction]').forEach(btn=>btn.onclick=()=>{const a=btn.dataset.baction,st=read(),b=st.built?.[id],d=b&&BUILDINGS[b.type];if(a==='back')return decorate(id);if(!b)return;if(a==='remove'){if(b.type==='hideout'){st.hitmen=(st.hitmen||0)+(b.troops||0);st.stationed=Math.max(0,(st.stationed||0)-(b.troops||0))}st.money=(st.money||0)+Math.floor((d.cost||0)*.5);delete st.built[id];write(st);document.getElementById('money').textContent=fmt(st.money);decorate(id);toast(`Gebäude abgerissen · +${fmt(Math.floor(d.cost*.5))} $.`)}if(a==='station'){const free=Math.min(Number(st.hitmen||0),Number(b.capacity||10)-Number(b.troops||0));if(free<=0)return toast('Kein Platz oder keine freien Truppen.');const n=Math.max(1,Math.min(free,Number(prompt(`Wie viele Truppen? (max. ${free})`,'1')||0)));b.troops=(b.troops||0)+n;st.hitmen-=n;st.stationed=(st.stationed||0)+n;write(st);buildingPanel(id);toast(`${n} Truppen im Gangversteck stationiert.`)}});
 };
 const decorate=id=>{const body=document.getElementById('drawerBody');if(!body||!id)return;const s=read(),f=s.fields?.[id];if(!f)return;const b=s.built?.[id],p=Math.round(defense(id)*100);let old=body.querySelector('[data-building-open]');if(!old){old=document.createElement('button');old.className='panel-action';old.dataset.buildingOpen='1';body.appendChild(old)}old.textContent=b?`${BUILDINGS[b.type]?.icon||'🏗️'} ${BUILDINGS[b.type]?.name||'Gebäude'} verwalten`:'🏗️ Gebäude auf diesem Feld errichten';old.onclick=()=>buildingPanel(id);let info=body.querySelector('[data-building-info]');if(!info){info=document.createElement('div');info.className='panel-hint';info.dataset.buildingInfo='1';body.appendChild(info)}info.innerHTML=p?`🛡️ <b>Geschützt</b>: +${p}% Verteidigung. Schutzradius wird in alle Richtungen berechnet, <b>diagonal eingeschlossen</b>.`:''};
 const observe=()=>{const root=document.getElementById('drawerBody');if(!root)return;new MutationObserver(()=>{wrap();const id=window.__mtrwBuildingCell;if(id)decorate(id)}).observe(root,{childList:true,subtree:true});};
 wrap();setTimeout(()=>{wrap();observe()},200);
 const economy=()=>{const s=read(),now=Date.now(),mins=Math.max(0,Math.min(60,(now-(s.__buildingTick||now))/60000));if(mins<.016)return;let money=0,material=0,rep=0,products=0;Object.entries(s.fields||{}).forEach(([id,f])=>{const b=s.built?.[id],d=BUILDINGS[b?.type];(f.props||[]).forEach(p=>{const mult=d?.yield?.[p]||1;if(p==='money')money+=mult*mins;if(p==='material')material+=mult*mins;if(p==='reputation')rep+=mult*mins});if(d?.product)products+=Math.floor((s.material||0)/5*mins)});s.money=(s.money||0)+Math.floor(money);s.material=(s.material||0)+Math.floor(material);s.influence=(s.influence||0)+Math.floor(rep);if(products>0){const batches=Math.min(products,Math.floor((s.material||0)/5));s.material-=batches*5;s.product=(s.product||0)+batches}s.__buildingTick=now;write(s);['money','material','product','level'].forEach(i=>{const e=document.getElementById(i);if(e)e.textContent=fmt(s[i])});if(money||material||rep||products)toast(`Gebäudeproduktion: +${Math.floor(money)} $ · +${Math.floor(material)} Material${rep?` · +${Math.floor(rep)} Ruhm`:''}${products?` · +${products} Produkt`:''}`)};
 economy();setInterval(economy,15000);
});
})();
