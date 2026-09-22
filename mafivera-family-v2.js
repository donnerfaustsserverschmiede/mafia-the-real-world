/* MAFIVERA FAMILY V2 — family dashboard, daily donation and treasury expansion */
(()=>{'use strict';
const db=window.db;
if(!db)return;

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Number(n||0).toLocaleString('de-DE');
const money=n=>fmt(n)+' $';
let view='dashboard';

function drawer(title,html){
  const d=document.getElementById('drawer'),t=document.getElementById('drawerTitle'),b=document.getElementById('drawerBody');
  if(!d||!t||!b)return;
  t.textContent=title;b.innerHTML=html;d.classList.remove('hidden');
}

function bind(){
  document.querySelectorAll('#drawerBody [data-family-action]').forEach(x=>{
    x.onclick=()=>familyAction(x.dataset.familyAction,x.dataset.value||'');
  });
}

async function familyAction(action,value){
  try{
    if(action==='tab'){view=value;return renderFamily();}
    const s=await db.auth.getSession(),uid=s.data.session?.user?.id;
    if(!uid)throw Error('not_authenticated');

    if(action==='donate'){
      const q=await db.from('mtrw_family_members').select('family_id').eq('user_id',uid).single();
      if(q.error)throw q.error;
      const r=await db.rpc('mtrw_family_donate',{p_family_id:q.data.family_id,p_amount:100});
      if(r.error)throw r.error;
      window.__mtrwFamilyToast?.('100 $ gespendet → 100 Familienpunkte.');
      return renderFamily();
    }
    if(action==='rank'){
      const [memberId,nextRole]=String(value||'').split('|');
      if(!memberId||!nextRole)throw Error('invalid_rank_change');
      const r=await db.rpc('mtrw_family_set_member_role',{p_family_id:(await db.from('mtrw_family_members').select('family_id').eq('user_id',uid).single()).data.family_id,p_user_id:memberId,p_role:nextRole});
      if(r.error)throw r.error;
      window.__mtrwFamilyToast?.(nextRole==='Mitglied'?'Mitglied wurde degradiert.':'Mitglied wurde befördert.');
      return renderFamily();
    }

    if(action==='kick'){
      const memberId=String(value||'');
      if(!memberId)throw Error('family_member_not_found');
      if(!confirm('Dieses Mitglied wirklich aus der Familie entfernen?'))return;
      const fq=await db.from('mtrw_family_members').select('family_id').eq('user_id',uid).single();
      if(fq.error)throw fq.error;
      const r=await db.rpc('mtrw_family_remove_member',{p_family_id:fq.data.family_id,p_user_id:memberId});
      if(r.error)throw r.error;
      window.__mtrwFamilyToast?.('Mitglied wurde aus der Familie entfernt.');
      return renderFamily();
    }

    if(action==='leave-family'){
      if(!confirm('Familie wirklich verlassen?'))return;
      const r=await db.rpc('mtrw_family_leave',{});
      if(r.error)throw r.error;
      window.__mtrwFamilyToast?.('Du hast die Familie verlassen.');
      return renderFamily();
    }

    if(action==='alliance-request'){
      const r=await db.rpc('mtrw_alliance_request',{p_to_alliance:value});
      if(r.error)throw r.error;
      window.__mtrwFamilyToast?.('Bündnisanfrage wurde gesendet.');
      return renderFamily();
    }

    if(action==='alliance-decision'){
      const [rid,accept]=String(value||'').split('|');
      const r=await db.rpc('mtrw_alliance_request_decide',{p_request:rid,p_accept:accept==='1'});
      if(r.error)throw r.error;
      window.__mtrwFamilyToast?.(accept==='1'?'Bündnis angenommen.':'Bündnis abgelehnt.');
      return renderFamily();
    }

    if(action==='upgrade'){
      const q=await db.from('mtrw_family_members').select('family_id').eq('user_id',uid).single();
      if(q.error)throw q.error;
      const r=await db.rpc('mtrw_family_upgrade',{p_family_id:q.data.family_id,p_upgrade_key:value});
      if(r.error)throw r.error;
      window.__mtrwFamilyToast?.((r.data?.name||'Ausbau')+' auf Stufe '+(r.data?.level||'?')+' ausgebaut.');
      view='expansion';
      return renderFamily();
    }

    if(action==='create'){
      const name=prompt('Familienname');
      if(!name)return;
      const tag=(prompt('Familien-Tag','MAF')||'MAF').slice(0,6);
      const r=await db.rpc('mtrw_family_create',{
        p_id:crypto.randomUUID(),p_name:name,p_tag:tag,
        p_description:'Zusammenhalt, Ehre, Familie',p_image_url:null
      });
      if(r.error)throw r.error;
      view='dashboard';window.__mtrwFamilyToast?.('Familie gegründet.');return renderFamily();
    }

    if(action==='join'){
      const r=await db.rpc('mtrw_family_join',{p_family_id:value});
      if(r.error)throw r.error;
      view='dashboard';window.__mtrwFamilyToast?.('Familie beigetreten.');return renderFamily();
    }
  }catch(e){
    const msg=e.message==='donation_already_today'?'Du hast heute bereits gespendet.':
      e.message==='family_treasury_insufficient'?'Die Familienkasse reicht für diesen Ausbau nicht aus.':
      e.message==='family_leadership_required'?'Nur die Familienleitung darf den Ausbau starten.':
      e.message||'Familienaktion fehlgeschlagen';
    window.__mtrwFamilyToast?.(msg,true);
  }
}

async function renderFamily(){
  const s=await db.auth.getSession(),uid=s.data.session?.user?.id;
  if(!uid)return;
  const q=await db.from('mtrw_family_members')
    .select('family_id,role,family_points,donated_total,last_donation_at')
    .eq('user_id',uid).maybeSingle();
  if(q.error)throw q.error;

  if(!q.data){
    const hq=await db.from('world_territories').select('zone_key').eq('owner_id',uid).eq('building_type','headquarters').limit(1);const hasHQ=!hq.error&&(hq.data||[]).length>0;
    drawer('Familie',`
      <div class="hero"><span class="hero-icon">♜</span><div><b>Noch keine Familie</b>
      <p>${hasHQ?'Gründe deine eigene Familie oder tritt einer bestehenden bei.':'Für die Gründung einer Familie wird weiterhin ein Hauptquartier benötigt.'}</p></div></div>
      ${hasHQ?'<button class="action primary" data-family-action="create">♜ Familie gründen</button>':''}
      <button class="action" data-family-action="join-list">👥 Familien suchen</button>`);
    document.querySelector('#drawerBody [data-family-action="join-list"]')?.addEventListener('click',showFamilyList);
    return;
  }

  const f=await db.from('mtrw_families').select('*').eq('id',q.data.family_id).single();
  if(f.error)throw f.error;
  const members=await db.from('mtrw_family_members')
    .select('user_id,role,family_points,donated_total,last_donation_at')
    .eq('family_id',q.data.family_id);
  if(members.error)throw members.error;
  const ids=(members.data||[]).map(x=>x.user_id);
  const profiles=ids.length?await db.from('profiles').select('id,username,mafia_name,level').in('id',ids):{data:[]};
  const names={};(profiles.data||[]).forEach(p=>names[p.id]=p.username||p.mafia_name||p.id.slice(0,8));const qFamilyId=q.data.family_id;
  const up=await db.from('mtrw_family_upgrades').select('upgrade_key,level').eq('family_id',q.data.family_id);
  if(up.error)throw up.error;
  const upgrades={};(up.data||[]).forEach(x=>upgrades[x.upgrade_key]=Number(x.level||0));

  const last=q.data.last_donation_at?new Date(q.data.last_donation_at):null;
  const donatedToday=last&&last.toLocaleDateString('de-DE')===new Date().toLocaleDateString('de-DE');
  const leadership=['Anführer','Ältester','Vize'].includes(q.data.role);
  const nav=['dashboard','members','expansion','alliances','manage'].map(k=>`
    <button class="mini ${view===k?'active':''}" data-family-action="tab" data-value="${k}">
      ${({dashboard:'Dashboard',members:'Mitglieder',expansion:'Ausbau',alliances:'Bündnisse',manage:'Verwalten'})[k]}
    </button>`).join('');

  let body='';
  if(view==='members'){
    const canManageRanks=q.data.role==='Anführer'||q.data.user_id===f.data.owner_id;
    const rankName={Anführer:'Don',Vize:'Underboss',Ältester:'Consigliere',Mitglied:'Soldat'};
    body=`<div class="hint">Familienmitglieder können sich selbstständig aus der Familie abmelden.</div><div class="list">${(members.data||[]).map(m=>{
      const self=m.user_id===uid, role=m.role;
      const up=role==='Mitglied'?'Ältester':role==='Ältester'?'Vize':role==='Vize'?'Anführer':null;
      const down=role==='Anführer'?'Vize':role==='Vize'?'Ältester':role==='Ältester'?'Mitglied':null;
      return `<div class="row"><span>👤 ${esc(names[m.user_id]||m.user_id.slice(0,8))}<small>♜ ${esc(rankName[role]||role)} · ${fmt(m.family_points)} Punkte</small></span><span class="family-rank-actions">${self?`<button class="mini danger" data-family-action="leave-family">🚪 Familie verlassen</button>`:''}${canManageRanks&&!self&&up?`<button class="mini" data-family-action="rank" data-value="${esc(m.user_id+'|'+up)}">⬆️ Befördern</button>`:''}${canManageRanks&&!self&&down?`<button class="mini danger" data-family-action="rank" data-value="${esc(m.user_id+'|'+down)}">⬇️ Degradieren</button>`:''}${canManageRanks&&!self?`<button class="mini danger" data-family-action="kick" data-value="${esc(m.user_id)}">🚪 Rauswerfen</button>`:''}</span></div>`;
    }).join('')}</div>`;
  }else if(view==='expansion'){
    const defs=[
      ['march_speed','Marschtempo','⚡','+5% Marschgeschwindigkeit je Stufe'],
      ['troop_strength','Truppenstärke','⚔️','+5% Angriffskraft je Stufe'],
      ['training','Truppenproduktion','👤','+5% schnellere Schlägerproduktion je Stufe'],
      ['workshop','Bauhütte','🏗️','+5% schnellerer Gebäudeausbau je Stufe'],
      ['trade','Handelswege','💰','+5% Dealerpreis je Stufe']
    ];
    body=`<div class="hint">Die Familienkasse wird durch die täglichen Mitgliedsbeiträge aufgebaut. Nur die Familienleitung kann diese gemeinsame Kasse für den Ausbau verwenden.</div>
    <div class="list">${defs.map(d=>{
      const level=upgrades[d[0]]||0,next=level+1,cost=2000*next;
      return `<div class="row"><span>${d[2]} <b>${d[1]} · Stufe ${level}/20</b><small>${d[3]} · nächste Stufe ${level>=20?'MAX':fmt(cost)+' $'}</small></span>
      ${leadership&&level<20?`<button class="mini" data-family-action="upgrade" data-value="${d[0]}" ${Number(f.data.treasury||0)<cost?'disabled':''}>Ausbauen</button>`:'<small>'+((level>=20)?'MAX':'Nur Leitung')+'</small>'}</div>`;
    }).join('')}</div>`;
  }else if(view==='alliances'){
    let allianceHtml='<div class="hint">Suche andere Allianzen und sende ihnen eine Bündnisanfrage.</div>';
    try{
      const ar=await db.rpc('mtrw_alliance_snapshot');
      const rr=await db.rpc('mtrw_alliance_requests_snapshot');
      const alliance=ar.data?.alliance;
      const allies=ar.data?.diplomacy||[];
      const requests=rr.data||[];
      allianceHtml=`<div class="production-card"><h3>🔎 Allianzen suchen</h3><input id="allianceSearch" class="input" placeholder="Allianzname oder Tag..." /><div id="allianceSearchResults"></div></div>`;
      if(requests.length){
        allianceHtml+=`<div class="production-card"><h3>📨 Bündnisanfragen</h3><div class="list">${requests.map(x=>`<div class="row"><span>🤝 <b>${esc(x.name)} [${esc(x.tag)}]</b><small>Level ${fmt(x.level)} · ${fmt(x.points)} Punkte</small></span><span><button class="mini" data-family-action="alliance-decision" data-value="${x.id}|1">Annehmen</button><button class="mini danger" data-family-action="alliance-decision" data-value="${x.id}|0">Ablehnen</button></span></div>`).join('')}</div></div>`;
      }
      if(allies.length) allianceHtml+=`<div class="production-card"><h3>🤝 Aktive Bündnisse</h3><div class="list">${allies.map(x=>`<div class="row"><span>🤝 ${esc(x.ally_alliance_name||x.name||'Bündnis')}<small>Status: ${esc(x.status||'ally')}</small></span><b>Aktiv</b></div>`).join('')}</div></div>`;
      else allianceHtml+='<div class="hint">Noch keine aktiven Bündnisse.</div>';
      body=allianceHtml;
    }catch(e){body='<div class="hint">Bündnisse konnten nicht geladen werden.</div>';}
  }else if(view==='manage'){
    body=`<div class="list">
      <div class="row"><span>👑 Deine Rolle</span><b>${esc(q.data.role)}</b></div>
      <div class="row"><span>👥 Mitglieder</span><b>${fmt(members.data?.length||0)}/${fmt(f.data.member_cap)}</b></div>
      <div class="row"><span>💰 Familienkasse</span><b>${money(f.data.treasury)}</b></div>
      <div class="row"><span>🏆 Siege</span><b>${fmt(f.data.wins)}</b></div>
      <div class="row"><span>☠️ Niederlagen</span><b>${fmt(f.data.losses)}</b></div>
    </div>`;
  }else{
    body=`<div class="statgrid">
      <div><b>${fmt(members.data?.length||0)}</b><small>Mitglieder</small></div>
      <div><b>${fmt(f.data.member_cap)}</b><small>Kapazität</small></div>
      <div><b>${fmt(f.data.wins)}</b><small>Siege</small></div>
    </div>
    <div class="hint">${esc(f.data.description||'Zusammenhalt, Ehre, Familie')}</div>
    <div class="production-card"><h3>💰 Tagesbeitrag</h3>
      <p>Jedes Mitglied kann <b>genau einmal pro Kalendertag</b> 100 $ spenden. Die 100 $ werden direkt in <b>100 Familienpunkte</b> umgewandelt.</p>
      ${donatedToday?'<button class="action" disabled>✅ Heute bereits gespendet</button>':'<button class="action primary" data-family-action="donate">💰 100 $ spenden</button>'}
      <small>${donatedToday?'Die nächste Spende ist morgen möglich.':'Das Geld geht nicht in eine Familienkasse. Es wird vollständig in Familienpunkte umgewandelt.'}</small>
    </div>
    <div class="statgrid">
      <div><b>${fmt(f.data.points)}</b><small>Familienpunkte</small></div>
      <div><b>${fmt(f.data.points)}</b><small>Familienpunkte</small></div>
      <div><b>${money(q.data.donated_total||0)}</b><small>Deine Spenden</small></div>
    </div>`;
  }

  drawer('♜ '+f.data.name+' ['+f.data.tag+']',
    `<div class="hero"><span class="hero-icon">♜</span><div><b>${esc(f.data.name)}</b><p>Familienlevel ${fmt(f.data.level)} · ${fmt(f.data.points)} Punkte</p></div></div>
    <div class="tabs family-tabs">${nav}</div>${body}`);
  bind();
  const search=document.getElementById('allianceSearch');
  if(search){
    let timer;
    search.addEventListener('input',()=>{
      clearTimeout(timer);
      timer=setTimeout(async()=>{
        const r=await db.rpc('mtrw_alliance_search',{p_query:search.value});
        const box=document.getElementById('allianceSearchResults');
        if(!box)return;
        if(r.error||!search.value.trim()){box.innerHTML='';return;}
        box.innerHTML=`<div class="list">${(r.data||[]).map(x=>`<div class="row"><span>🤝 <b>${esc(x.name)} [${esc(x.tag)}]</b><small>Level ${fmt(x.level)} · ${fmt(x.member_count)} Mitglieder · ${fmt(x.points)} Punkte</small></span><button class="mini" data-family-action="alliance-request" data-value="${x.id}">Bündnis anfragen</button></div>`).join('')}</div>`;
        bind();
      },250);
    });
  }
}

async function showFamilyList(){
  try{
    const q=await db.from('mtrw_families').select('id,name,tag,level,points,member_cap').order('points',{ascending:false}).limit(50);
    if(q.error)throw q.error;
    drawer('Familien suchen',`<div class="list">${(q.data||[]).map(f=>`
      <div class="row"><span>♜ ${esc(f.name)} [${esc(f.tag)}]<small>Level ${fmt(f.level)} · ${fmt(f.member_cap)} Plätze · ${fmt(f.points)} Punkte</small></span>
      <button class="mini" data-family-action="join" data-value="${esc(f.id)}">Beitreten</button></div>`).join('')}</div>`);
    bind();
  }catch(e){window.__mtrwFamilyToast?.(e.message||'Familien konnten nicht geladen werden.',true);}
}

window.__mtrwFamilyToast=(t,e=false)=>{
  const x=document.getElementById('toast');if(!x)return;
  x.textContent=t;x.className='toast show '+(e?'error':'');clearTimeout(window.__mtrwFamilyToast.t);
  window.__mtrwFamilyToast.t=setTimeout(()=>x.className='toast',2800);
};

document.addEventListener('click',e=>{
  const b=e.target.closest('.bottom-btn[data-panel="family"]');
  if(!b)return;
  e.preventDefault();e.stopImmediatePropagation();
  renderFamily().catch(err=>window.__mtrwFamilyToast?.(err.message||'Familie konnte nicht geladen werden.',true));
},true);
})();