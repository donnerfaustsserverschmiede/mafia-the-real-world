/* MAFIVERA V4 — persistent offline mailbox / notifications */
(()=>{'use strict';
let uid=null,channel=null,items=[];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmtDate=v=>{try{return new Date(v).toLocaleString('de-DE',{dateStyle:'short',timeStyle:'short'})}catch{return ''}};
const icon=k=>(​{
  family_application:'📨',family_application_approved:'✅',family_application_rejected:'❌',
  family_invite:'♜',friend_request:'👥',trade_offer:'💰',production_ready:'🏭',
  business_task_ready:'💼',sanction:'⚖️',announcement:'📢',march_arrived:'🗺️',
  march_completed:'🗺️',march_battle:'⚔️',march_failed:'⚠️',weapon_dealer:'🔫',dealer:'🕶️'
}[k]||'✉️');
function ensureUi(){
  if(document.getElementById('mtrwMailboxButton'))return;
  const b=document.createElement('button');b.id='mtrwMailboxButton';b.className='mtrw-mailbox-btn';
  b.title='Postfach';b.innerHTML='<span>✉️</span><i id="mtrwMailboxBadge">0</i>';
  document.body.appendChild(b);b.onclick=()=>openMailbox();
  const s=document.createElement('style');s.textContent=`
    .mtrw-mailbox-btn{position:fixed;top:12px;right:12px;z-index:3200;width:52px;height:52px;border:1px solid #596575;border-radius:15px;background:#10151eec;color:#fff;font-size:25px;box-shadow:0 8px 24px #0008;cursor:pointer}
    .mtrw-mailbox-btn:active{transform:scale(.94)}
    .mtrw-mailbox-btn i{position:absolute;right:-5px;top:-5px;min-width:20px;height:20px;padding:0 5px;box-sizing:border-box;border-radius:10px;background:#c52f3d;color:#fff;font:700 11px/20px system-ui;font-style:normal;display:none;border:2px solid #10151e}
    .mtrw-mailbox-btn i.show{display:block}
    .mtrw-mailbox-list{display:flex;flex-direction:column;gap:9px}
    .mtrw-mailbox-item{background:#151b24;border:1px solid #394553;border-radius:14px;padding:12px}
    .mtrw-mailbox-item.unread{border-color:#b28a28;box-shadow:0 0 0 1px #b28a2822}
    .mtrw-mailbox-head{display:flex;gap:9px;align-items:flex-start}
    .mtrw-mailbox-icon{font-size:23px}.mtrw-mailbox-title{font-weight:800;flex:1}.mtrw-mailbox-time{font-size:10px;color:#8f99a6}
    .mtrw-mailbox-message{color:#d6dbe1;font-size:13px;line-height:1.45;margin:8px 0 10px 32px;white-space:pre-wrap}
    .mtrw-mailbox-actions{display:flex;gap:6px;flex-wrap:wrap;margin-left:32px}
    .mtrw-mailbox-actions button{border:1px solid #4b5665;background:#202936;color:#fff;border-radius:9px;padding:7px 10px;cursor:pointer}
    .mtrw-mailbox-actions .primary{background:#8e2631;border-color:#b23b47}
    .mtrw-mailbox-empty{padding:30px 10px;text-align:center;color:#9ba4ae}
    @media(max-width:600px){.mtrw-mailbox-btn{top:8px;right:8px;width:56px;height:56px}.mtrw-mailbox-message{margin-left:0}.mtrw-mailbox-actions{margin-left:0}}
  `;document.head.appendChild(s);
}
function unreadCount(){return items.filter(x=>!x.read_at&&!x.resolved_at).length}
function updateBadge(){ensureUi();const n=unreadCount(),b=document.getElementById('mtrwMailboxBadge');b.textContent=n>99?'99+':n;b.classList.toggle('show',n>0)}
async function load(){
  if(!window.db)return;
  const s=await window.db.auth.getSession();uid=s.data.session?.user?.id;if(!uid)return;
  const r=await window.db.rpc('mtrw_my_notifications',{p_limit:100});if(r.error)return;
  items=r.data||[];updateBadge();
}
function openDrawer(title,html){const d=document.getElementById('drawer');if(!d)return;document.getElementById('drawerTitle').textContent=title;document.getElementById('drawerBody').innerHTML=html;d.classList.remove('hidden')}
async function openMailbox(){
  await load();
  const unread=unreadCount();
  const html='<div class="hero"><span class="hero-icon">✉️</span><div><b>Dein Postfach</b><p>'+unread+' ungelesene Nachricht'+(unread===1?'':'en')+'</p></div></div>'+
    '<div class="mtrw-mailbox-list">'+(items.length?items.map(renderItem).join(''):'<div class="mtrw-mailbox-empty">📭 Dein Postfach ist leer.</div>')+'</div>';
  openDrawer('✉️ Postfach',html);
  bind();
}
function renderItem(n){
  const actionable=['family_application','family_invite','friend_request','trade_offer'].includes(n.action_type);
  const read=!n.read_at&&!n.resolved_at?' unread':'';
  let buttons='';
  if(n.action_type==='family_application')buttons='<button class="primary" data-mail-action="family-accept" data-id="'+n.id+'">✅ Annehmen</button><button data-mail-action="family-reject" data-id="'+n.id+'">❌ Ablehnen</button>';
  else if(n.action_type==='family_invite')buttons='<button class="primary" data-mail-action="family-invite-accept" data-id="'+n.id+'">✅ Beitreten</button><button data-mail-action="family-invite-reject" data-id="'+n.id+'">❌ Ablehnen</button>';
  else if(n.action_type==='friend_request')buttons='<button class="primary" data-mail-action="friend-accept" data-id="'+n.id+'">✅ Annehmen</button><button data-mail-action="friend-reject" data-id="'+n.id+'">❌ Ablehnen</button>';
  else if(n.action_type==='trade_offer')buttons='<button class="primary" data-mail-action="trade-accept" data-id="'+n.id+'">✅ Annehmen</button><button data-mail-action="trade-reject" data-id="'+n.id+'">❌ Ablehnen</button>';
  else buttons='<button data-mail-action="read" data-id="'+n.id+'">'+(n.read_at?'Gelesen':'✓ Als gelesen markieren')+'</button>';
  return '<article class="mtrw-mailbox-item'+read+'"><div class="mtrw-mailbox-head"><span class="mtrw-mailbox-icon">'+icon(n.kind)+'</span><span class="mtrw-mailbox-title">'+esc(n.title)+'</span><span class="mtrw-mailbox-time">'+fmtDate(n.created_at)+'</span></div><div class="mtrw-mailbox-message">'+esc(n.message)+'</div><div class="mtrw-mailbox-actions">'+buttons+'</div></article>';
}
function bind(){
  document.querySelectorAll('[data-mail-action]').forEach(b=>b.onclick=async()=>{
    const id=b.dataset.id,a=b.dataset.mailAction;
    try{
      const n=items.find(x=>x.id===id);if(!n)return;
      let rpc=null,args={};
      if(a==='family-accept'){rpc='mtrw_family_application_decide';args={p_application_id:n.action_data.application_id,p_accept:true}}
      if(a==='family-reject'){rpc='mtrw_family_application_decide';args={p_application_id:n.action_data.application_id,p_accept:false}}
      if(a==='family-invite-accept'){rpc='mtrw_family_invite_decide';args={p_invite_id:n.action_data.invite_id,p_accept:true}}
      if(a==='family-invite-reject'){rpc='mtrw_family_invite_decide';args={p_invite_id:n.action_data.invite_id,p_accept:false}}
      if(a==='friend-accept'){rpc='mtrw_accept_friend_invite';args={p_invite_id:n.action_data.invite_id}}
      if(a==='friend-reject'){const r=await window.db.from('mtrw_social_friend_invites').update({status:'rejected',responded_at:new Date().toISOString()}).eq('id',n.action_data.invite_id);if(r.error)throw r.error}
      if(a==='trade-accept'){rpc='mtrw_accept_trade';args={p_trade_id:n.action_data.trade_id}}
      if(a==='trade-reject'){rpc='mtrw_reject_trade';args={p_trade_id:n.action_data.trade_id}}
      if(rpc){const r=await window.db.rpc(rpc,args);if(r.error)throw r.error}
      await window.db.rpc('mtrw_notification_resolve',{p_id:id});await load();await openMailbox();
    }catch(e){window.__mtrwFamilyToast?.(e.message||'Aktion konnte nicht ausgeführt werden.',true);window.__mtrwMailboxToast?.(e.message||'Aktion fehlgeschlagen',true)}
  });
}
window.__mtrwMailboxOpen=openMailbox;
window.__mtrwMailboxRefresh=load;
window.__mtrwMailboxToast=(t,e=false)=>{const x=document.getElementById('toast');if(!x)return;x.textContent=t;x.className='toast show '+(e?'error':'');clearTimeout(window.__mtrwMailboxToast.t);window.__mtrwMailboxToast.t=setTimeout(()=>x.className='toast',2800)};
function browserNotify(n){
  try{if(document.hidden&&'Notification'in window&&Notification.permission==='granted')new Notification(n.title,{body:n.message,tag:'mafivera-'+n.id})}catch{}
}
async function start(){
  ensureUi();await load();
  try{
    if('Notification'in window&&Notification.permission==='default'){}
  }catch{}
  if(channel)try{await window.db.removeChannel(channel)}catch{}
  channel=window.db.channel('mtrw-mailbox-'+uid).on('postgres_changes',{event:'INSERT',schema:'public',table:'mtrw_notifications',filter:'user_id=eq.'+uid},p=>{
    const n=p.new;if(!n)return;items=[n,...items.filter(x=>x.id!==n.id)];updateBadge();browserNotify(n);
    window.__mtrwMailboxToast?.(n.title+': '+n.message);
  }).subscribe();
  window.addEventListener('online',load);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)load()});
}
let tries=0;const timer=setInterval(async()=>{if(window.db){clearInterval(timer);const s=await window.db.auth.getSession();if(s.data.session)start()}else if(++tries>120)clearInterval(timer)},500);
})();
