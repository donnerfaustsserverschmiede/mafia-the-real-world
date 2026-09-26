import { withSupabase } from 'npm:@supabase/server@^1';

const CHANNEL_ID = '1549527766154616842';
const DISCORD_API = 'https://discord.com/api/v10';

function clean(value: unknown, depth = 0): unknown {
  if (depth > 4) return '[max depth]';
  if (value === null || value === undefined) return value;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) return value.slice(0, 25).map((v) => clean(v, depth + 1));
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>).slice(0, 40)) {
      if (/(password|token|secret|access_token|refresh_token|webhook|private_key|service_role|bot_token)/i.test(key)) out[key] = '[REDACTED]';
      else out[key] = clean(val, depth + 1);
    }
    return out;
  }
  return String(value);
}

function discordText(event: any): string {
  const operation = String(event.operation ?? 'UNKNOWN');
  const title = operation === 'INSERT' ? '🟢 INSERT' : operation === 'UPDATE' ? '🟡 UPDATE' : '🔴 DELETE';
  const details = JSON.stringify(clean({old_data:event.old_data ?? null,new_data:event.new_data ?? null,metadata:event.metadata ?? {}}), null, 2);
  return [
    '**MAFIVERA – GAME AUDIT**', title,
    `**Tabelle:** \`${String(event.table_name ?? 'unknown')}\``,
    `**Actor:** \`${event.actor_user_id ?? 'SYSTEM'}\``,
    `**Betroffen:** \`${event.subject_user_id ?? '—'}\``,
    `**Row:** \`${event.row_key ?? '—'}\``,
    `**Zeit:** <t:${Math.floor(new Date(event.occurred_at).getTime() / 1000)}:F>`,
    '', '```json', details.slice(0, 7000), '```'
  ].join('\n').slice(0, 1900);
}

async function sendDiscord(token: string, content: string) {
  const response = await fetch(`${DISCORD_API}/channels/${CHANNEL_ID}/messages`, {
    method: 'POST', headers: {'Authorization': `Bot ${token}`, 'Content-Type': 'application/json'},
    body: JSON.stringify({content, allowed_mentions:{parse:[]}})
  });
  if (response.ok) return {ok:true};
  return {ok:false,error:(await response.text()).slice(0,1000),status:response.status};
}

export default {
  fetch: withSupabase({auth:'secret'}, async (req, ctx) => {
    if (req.method !== 'POST') return Response.json({error:'method_not_allowed'},{status:405});
    const botToken = Deno.env.get('DISCORD_BOT_TOKEN');
    if (!botToken) return Response.json({error:'DISCORD_BOT_TOKEN_not_configured'},{status:503});
    let body: any; try { body = await req.json(); } catch { return Response.json({error:'invalid_json'},{status:400}); }
    const event = body?.record ?? body?.event ?? body;
    if (!event?.id || !event?.operation || !event?.table_name) return Response.json({error:'invalid_audit_event'},{status:400});
    const result = await sendDiscord(botToken, discordText(event));
    if (result.ok) await ctx.supabaseAdmin.from('mtrw_audit_events').update({discord_sent:true,discord_sent_at:new Date().toISOString(),discord_error:null}).eq('id',event.id);
    else await ctx.supabaseAdmin.from('mtrw_audit_events').update({discord_error:result.error ?? 'discord_send_failed'}).eq('id',event.id);
    return Response.json(result,{status:result.ok ? 200 : 502});
  })
};