/* MTRW Live Presence v1
   Uses Supabase Realtime Broadcast instead of writing every GPS update to SQL.
   Players are partitioned into geographic rooms so a global 10k-player world
   does not create one giant realtime channel.
*/
(()=>{
  if(window.mtrwPresenceInstalled||!window.db)return;
  window.mtrwPresenceInstalled=true;
  const Z=10;
  const channels=new Map();
  let active=null,lastSent=0,latest=null;
  function tile(lat,lng){const n=2**Z;return{ x:Math.floor((lng+180)/360*n), y:Math.floor((1-Math.asinh(Math.tan(lat*Math.PI/180))/Math.PI)/2*n)}}
  function room(lat,lng){const t=tile(lat,lng);return`mtrw-presence-${Z}-${t.x}-${t.y}`}
  async function join(name){if(channels.has(name))return channels.get(name);const ch=window.db.channel(name,{config:{broadcast:{self:false}}});ch.on('broadcast',{event:'position'},({payload})=>{if(payload?.user_id===window.getMtrwState?.()?.user?.id)return;window.dispatchEvent(new CustomEvent('mtrw:player-position',{detail:payload}))});const status=await ch.subscribe();if(status!=='SUBSCRIBED'){try{await window.db.removeChannel(ch)}catch{}return null}channels.set(name,ch);return ch}
  async function send(lat,lng,accuracy){const st=window.getMtrwState?.()||{},u=st.user;if(!u)return;const name=room(lat,lng);if(active!==name){active=name;await join(name)}const now=Date.now();if(now-lastSent<1000)return;lastSent=now;latest={user_id:u.id,username:st.profile?.username||'Spieler',lat,lng,accuracy,ts:now};const ch=channels.get(name);if(ch)await ch.send({type:'broadcast',event:'position',payload:latest})}
  window.addEventListener('mtrw:gps-position',e=>{const p=e.detail;if(p)send(Number(p.lat),Number(p.lng),Number(p.accuracy||0))});
  window.mtrwPresence={send,rooms:()=>[...channels.keys()]};
})();
