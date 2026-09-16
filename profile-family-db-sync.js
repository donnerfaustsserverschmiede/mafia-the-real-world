/* MAFIVERA V1 — Family cloud sync bridge */
(()=>{'use strict';
if(window.__mtrwFamilyDbSync)return;window.__mtrwFamilyDbSync=true;
const key=()=>{const id=window.__mtrwUserId;if(id)return'mafivera:v1:save:'+id;return Object.keys(localStorage).find(x=>x.startsWith('mafivera:v1:save:'))};
const read=()=>{try{const k=key();return k?JSON.parse(localStorage.getItem(k)||'{}'):{} }catch(e){return{}}};
const write=s=>{try{const k=key();if(k)localStorage.setItem(k,JSON.stringify(s))}catch(e){}};
const sync=async()=>{if(!window.db?.from||!window.__mtrwUserId)return;const s=read(),f=s.family||null;if(!f)return;try{
 let family=null;const q=await window.db.from('mtrw_families').select('*').eq('id',f.id).maybeSingle();if(!q.error)family=q.data;
 if(!family){const r=await window.db.rpc('mtrw_family_create',{p_id:f.id,p_name:f.name,p_tag:f.tag||'FAM',p_description:f.description||'',p_image_url:f.image||null});if(r.error&& !/already|duplicate/i.test(r.error.message))console.warn('Family cloud create:',r.error.message)}
 await window.db.from('mtrw_family_members').upsert({family_id:f.id,user_id:window.__mtrwUserId,role:(f.members||[]).find(m=>m.id===window.__mtrwUserId)?.role||'Mitglied'},{onConflict:'family_id,user_id'});
 const fr=await window.db.from('mtrw_families').select('*').eq('id',f.id).maybeSingle();if(!fr.error&&fr.data){const x=fr.data;f.level=x.level;f.points=x.points;f.tribute=x.treasury;f.memberCap=x.member_cap;f.wins=x.wins;f.losses=x.losses;f.name=x.name;f.tag=x.tag;f.description=x.description;f.image=x.image_url||f.image}
 const mr=await window.db.from('mtrw_family_members').select('*').eq('family_id',f.id);if(!mr.error&&Array.isArray(mr.data)){f.members=mr.data.map(m=>({id:m.user_id,name:m.user_id===window.__mtrwUserId?(window.__mtrwCurrentUser?.user_metadata?.username||window.__mtrwCurrentUser?.email?.split('@')[0]||'Spieler'):'Mitglied',role:m.role,level:m.user_id===window.__mtrwUserId?(s.level||0):0,tiles:0,points:m.family_points||0,donated:m.donated_total||0,avatar:m.user_id===window.__mtrwUserId?s.avatar||'':''}))}
 s.family=f;s.familyId=f.id;write(s);window.mtrwOpenFamily?.();
 }catch(e){console.warn('Family cloud sync unavailable:',e)}};
const t=setInterval(()=>{if(window.db&&window.__mtrwUserId){sync();clearInterval(t)}},700);window.mtrwFamilyCloudSync=sync;
})();