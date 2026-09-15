import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,x-client-info,apikey,content-type','Access-Control-Allow-Methods':'POST,OPTIONS'};
const WEBHOOKS={game:'DISCORD_WEBHOOK_GAME',player:'DISCORD_WEBHOOK_PLAYER',register:'DISCORD_WEBHOOK_REGISTER',chat:'DISCORD_WEBHOOK_CHAT'} as const;
type Category=keyof typeof WEBHOOKS;
function json(body:unknown,status=200){return new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json; charset=utf-8'}})}
function clean(value:any,depth=0):any{
  if(depth>3)return '[max depth]';
  if(value===null||value===undefined||typeof value==='string'||typeof value==='number'||typeof value==='boolean')return value;
  if(Array.isArray(value))return value.slice(0,20).map(v=>clean(v,depth+1));
  if(typeof value==='object'){const out:any={};for(const [k,v] of Object.entries(value).slice(0,30)){if(/password|token|secret|access_token|webhook/i.test(k))continue;out[String(k).slice(0,80)]=clean(v,depth+1)}return out}
  return String(value);
}
async function discord(url:string,title:string,user:any,event:string,details:any){
  const fields=[{name:'Ereignis',value:event.slice(0,1024),inline:false},{name:'Spieler',value:(user?.user_metadata?.username||user?.email||user?.id||'System').toString().slice(0,1024),inline:true},{name:'Zeit',value:new Date().toLocaleString('de-DE',{timeZone:'Europe/Berlin'}),inline:true}];
  const detail=JSON.stringify(clean(details));
  if(detail&&detail!=='{}')fields.push({name:'Details',value:'```json\n'+detail.slice(0,3900)+'\n```',inline:false});
  const r=await fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username:'MTRW Logs',embeds:[{title,description:'MAFIA – The Real World',fields,timestamp:new Date().toISOString()}]})});
  return r.ok;
}
Deno.serve(async(req)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
  if(req.method!=='POST')return json({error:'method_not_allowed'},405);
  const url=Deno.env.get('SUPABASE_URL'),service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if(!url||!service)return json({error:'server_not_configured'},500);
  const auth=req.headers.get('Authorization')||'';if(!auth.startsWith('Bearer '))return json({error:'unauthorized'},401);
  const client=createClient(url,service,{global:{headers:{Authorization:auth}}});
  const {data:{user}}=await client.auth.getUser();if(!user)return json({error:'unauthorized'},401);
  let body:any;try{body=await req.json()}catch{return json({error:'invalid_json'},400)}
  const category=String(body?.category||'') as Category,event=String(body?.event||'').trim();
  if(!Object.prototype.hasOwnProperty.call(WEBHOOKS,category)||!event)return json({error:'invalid_event'},400);
  const webhook=Deno.env.get(WEBHOOKS[category]);if(!webhook)return json({error:'webhook_not_configured'},503);
  const details=clean(body?.details||{});
  const title=category==='game'?'🎮 Game-Log':category==='player'?'👤 Player-Log':category==='register'?'📝 Register-Log':'💬 Chat-Log';
  const payload={user_id:user.id,category,event,details};
  const {error:dbError}=await client.from('game_logs').insert(payload);
  if(dbError)console.error('[MTRW] log insert',dbError);
  const sent=await discord(webhook,title,user,event,details);
  if(!sent)console.error('[MTRW] Discord webhook failed',category,event);
  return json({success:true,discord:sent});
});
