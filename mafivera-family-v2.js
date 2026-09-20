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
      await db.rpc('mtrw_family_donate',{p_family_id:q.data.family_id,p_amount:100});
      window.__mtrwFamilyToast?.('Tagesbeitrag von 100 $ geleistet.');
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
      const parts=String(value).split('|');
      const familyId=parts[0], mode=parts[1]||'open';
      let r;
      if(mode==='application'){
        const message=prompt('Bewerbung an die Familienleitung (optional):','');
        if(message===null)return;
        r=await db.rpc('mtrw_family_apply',{p_family_id:familyId,p_message:message});
      }else{
        r=await db.rpc('mtrw_family_join',{p_family_id:familyId});
      }
      if(r.error)throw r.error;
      view='dashboard';
      window.__mtrwFamilyToast?.(mode==='application'?'Bewerbung wurde abgeschickt.':'Familie beigetreten.');
      return renderFamily();
    }

    if(action==='join-mode'){
      const q=await db.from('mtrw_family_members').select('family_id').eq('user_id',uid).single();
      if(q.error)throw q.error;
      const r=await db.rpc('mtrw_family_set_join_mode',{p_family_id:q.data.family_id,p_join_mode:value});
      if(r.error)throw r.error;
      window.__mtrwFamilyToast?.(value==='application'?'Bewerbungen sind jetzt erforderlich.':'Spieler können jetzt frei beitreten.');
      return renderFamily();
    }

    if(action==='application'){
      const [id,accept]=String(value).split('|');
      const r=await db.rpc('mtrw_family_application_decide',{p_application_id:id,p_accept:accept==='1'});
      if(r.error)throw r.error;
      window.__mtrwFamilyToast?.(accept==='1'?'Bewerbung angenommen.':'Bewerbung abgelehnt.');
      return renderFamily();
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
  const members=await db.rpc('mtrw_family_members_snapshot',{p_family_id:q.data.family_id});
  if(members.error)throw members.error;
  const names={};(members.data||[]).forEach(p=>names[p.user_id]=p.username||p.mafia_name||p.user_id.slice(0,8));
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
    body=`<div class="list">${(members.data||[]).map(m=>`
      <div class="row"><span>👤 ${esc(names[m.user_id]||m.user_id.slice(0,8))}
      <small>${esc(m.role)} · ${fmt(m.family_points)} Punkte</small></span>
      <b>${money(m.donated_total||0)}</b></div>`).join('')}</div>`;
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
    let allianceHtml='<div class="hint">Diplomatie</div>';
    try{
      const ar=await db.rpc('mtrw_alliance_snapshot');
      if(!ar.error&&ar.data?.alliance){
        const a=ar.data.alliance;
        const allies=ar.data.diplomacy||[];
        allianceHtml=`<div class="hero"><span class="hero-icon">🤝</span><div><b>${esc(a.name)} [${esc(a.tag)}]</b><p>Bestehende Allianz-Diplomatie</p></div></div>`
          +`<div class="list">${allies.length?allies.map(x=>`<div class="row"><span>🤝 ${esc(x.ally_alliance_name||x.name||'Bündnis')}<small>Status: ${esc(x.status||'ally')}</small></span><b>Aktiv</b></div>`).join(''):'<div class="hint">Noch keine Bündnisse vorhanden.</div>'}</div>`;
      }else{
        allianceHtml='<div class="hero"><span class="hero-icon">🤝</span><div><b>Noch keine Diplomatie</b><p>Es besteht derzeit kein aktives Bündnis.</p></div></div><div class="hint">Das bestehende Allianz-System bleibt separat erhalten und wird hier angezeigt, sobald dein Spieler einer Allianz angehört.</div>';
      }
    }catch(e){
      allianceHtml='<div class="hero"><span class="hero-icon">🤝</span><div><b>Diplomatie</b><p>Keine aktiven Bündnisse gefunden.</p></div></div>';
    }
    body=allianceHtml;
  }else if(view==='manage'){
    let apps=[];
    if(leadership){
      const ar=await db.rpc('mtrw_family_application_list',{p_family_id:q.data.family_id});
      if(!ar.error)apps=ar.data||[];
    }
    body=`<div class="list">
      <div class="row"><span>👑 Deine Rolle</span><b>${esc(q.data.role)}</b></div>
      <div class="row"><span>👥 Mitglieder</span><b>${fmt(members.data?.length||0)}/${fmt(f.data.member_cap)}</b></div>
      <div class="row"><span>💰 Familienkasse</span><b>${money(f.data.treasury)}</b></div>
      <div class="row"><span>🏆 Siege</span><b>${fmt(f.data.wins)}</b></div>
      <div class="row"><span>☠️ Niederlagen</span><b>${fmt(f.data.losses)}</b></div>
    </div>
    <div class="production-card">
      <h3>🚪 Beitrittseinstellungen</h3>
      <p>Lege fest, ob Spieler sofort beitreten dürfen oder erst von der Familienleitung angenommen werden müssen.</p>
      <div class="list">
        <div class="row"><span>⚡ Freier Beitritt<small>Spieler treten sofort bei.</small></span>
          <button class="mini ${f.data.join_mode==='open'?'active':''}" data-family-action="join-mode" data-value="open">${f.data.join_mode==='open'?'✅ Aktiv':'Aktivieren'}</button></div>
        <div class="row"><span>📨 Bewerbung<small>Spieler müssen sich bewerben.</small></span>
          <button class="mini ${f.data.join_mode==='application'?'active':''}" data-family-action="join-mode" data-value="application">${f.data.join_mode==='application'?'✅ Aktiv':'Aktivieren'}</button></div>
      </div>
    </div>
    ${leadership?'<div class="production-card"><h3>📨 Bewerbungen</h3>'+(
      apps.filter(a=>a.status==='pending').length
        ? '<div class="list">'+apps.filter(a=>a.status==='pending').map(a=>`<div class="row"><span>👤 ${esc(a.username||a.mafia_name||a.user_id.slice(0,8))}<small>${esc(a.message||'Keine Nachricht')}</small></span><span><button class="mini" data-family-action="application" data-value="${a.id}|1">Annehmen</button> <button class="mini" data-family-action="application" data-value="${a.id}|0">Ablehnen</button></span></div>`).join('')+'</div>'
        : '<div class="hint">Keine offenen Bewerbungen.</div>'
    )+'</div>':''}`;
  }else{
    body=`<div class="statgrid">
      <div><b>${fmt(members.data?.length||0)}</b><small>Mitglieder</small></div>
      <div><b>${fmt(f.data.member_cap)}</b><small>Kapazität</small></div>
      <div><b>${fmt(f.data.wins)}</b><small>Siege</small></div>
    </div>
    <div class="hint">${esc(f.data.description||'Zusammenhalt, Ehre, Familie')}</div>
    <div class="production-card"><h3>💰 Tagesbeitrag</h3>
      <p>Jedes Mitglied kann <b>genau einmal pro Kalendertag</b> 100 $ in die gemeinsame Familienkasse einzahlen.</p>
      ${donatedToday?'<button class="action" disabled>✅ Heute bereits gespendet</button>':'<button class="action primary" data-family-action="donate">💰 100 $ spenden</button>'}
      <small>${donatedToday?'Die nächste Spende ist morgen möglich.':'Die Spende wird gesammelt und steht der Familienleitung für den Ausbau zur Verfügung.'}</small>
    </div>
    <div class="statgrid">
      <div><b>${money(f.data.treasury)}</b><small>Familienkasse</small></div>
      <div><b>${fmt(f.data.points)}</b><small>Familienpunkte</small></div>
      <div><b>${money(q.data.donated_total||0)}</b><small>Deine Spenden</small></div>
    </div>`;
  }

  drawer('♜ '+f.data.name+' ['+f.data.tag+']',
    `<div class="hero"><span class="hero-icon">♜</span><div><b>${esc(f.data.name)}</b><p>Familienlevel ${fmt(f.data.level)} · ${fmt(f.data.points)} Punkte</p></div></div>
    <div class="tabs family-tabs">${nav}</div>${body}`);
  bind();
}

async function showFamilyList(){
  try{
    const q=await db.from('mtrw_families').select('id,name,tag,level,points,member_cap,join_mode').order('points',{ascending:false}).limit(50);
    if(q.error)throw q.error;
    drawer('Familien suchen',`<div class="list">${(q.data||[]).map(f=>`
      <div class="row"><span>♜ ${esc(f.name)} [${esc(f.tag)}]<small>Level ${fmt(f.level)} · ${fmt(f.member_cap)} Plätze · ${fmt(f.points)} Punkte · ${f.join_mode==='application'?'📨 Bewerbung':'⚡ Freier Beitritt'}</small></span>
      <button class="mini" data-family-action="join" data-value="${esc(f.id+'|'+(f.join_mode||'open'))}">${f.join_mode==='application'?'📨 Bewerben':'👥 Beitreten'}</button></div>`).join('')}</div>`);
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