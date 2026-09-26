import { withSupabase } from 'npm:@supabase/server@^1';

const CHANNEL_ID = '1549525247760400384';
const AUDIT_CHANNEL_ID = '1549527766154616842';
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

function nameOf(data: any, fallback = 'Unbekannter Spieler'): string {
  return String(data?.mafia_name || data?.username || data?.display_name || data?.name || fallback);
}

function num(v: any): string {
  const n = Number(v);
  return Number.isFinite(n) ? n.toLocaleString('de-DE') : String(v ?? '0');
}

function zone(v: any): string {
  return String(v ?? 'unbekannt').replace(/^zone[_-]?/i, '').toUpperCase();
}

function purpose(v: any): string {
  const p = String(v ?? '').toLowerCase();
  if (p.includes('heist')) return 'zum Heist';
  if (p.includes('attack')) return 'zum Angriff';
  if (p.includes('raid')) return 'zur Razzia';
  if (p.includes('conquest') || p.includes('capture')) return 'zur Eroberung';
  return '';
}

async function resolvePlayer(ctx: any, id: string | null, data: any): Promise<string> {
  if (data?.mafia_name || data?.username || data?.display_name || data?.name) return nameOf(data);
  if (!id) return 'System';
  try {
    const { data: p } = await ctx.supabaseAdmin
      .from('profiles')
      .select('mafia_name,username')
      .eq('id', id)
      .maybeSingle();
    return nameOf(p, id.slice(0, 8));
  } catch {
    return id.slice(0, 8);
  }
}

async function humanText(event: any, ctx: any): Promise<string> {
  const oldD = event.old_data ?? {};
  const newD = event.new_data ?? {};
  const data = Object.keys(newD).length ? newD : oldD;
  const actor = await resolvePlayer(ctx, event.actor_user_id || data.user_id || data.owner_id || null, data);
  const table = String(event.table_name ?? '');
  const op = String(event.operation ?? 'UNKNOWN');
  let text = '';

  if (table === 'mtrw_marches') {
    const count = num(data.troop_count ?? data.requested_troops);
    const target = zone(data.target_zone_key);
    const p = purpose(data.purpose);
    if (op === 'INSERT') text = `⚔️ **${actor} hat ${count} Schläger ${p || 'losgeschickt'} nach ${target} geschickt.**`;
    else if (op === 'UPDATE' && data.status) text = `⚔️ **${actor}: Marsch nach ${target} ist jetzt „${data.status}“.**`;
  } else if (table === 'mtrw_heist_attacks') {
    text = `💥 **${actor} hat ${num(data.requested_troops)} Schläger zu Heist ${zone(data.heist_id)} geschickt.**`;
  } else if (table === 'mtrw_heist_participants') {
    text = `💥 **${actor} nimmt mit ${num(data.troops_sent)} Schlägern an Heist ${zone(data.heist_id)} teil.**`;
  } else if (table === 'mtrw_heists') {
    if (op === 'INSERT') text = `💀 **Heist ${zone(data.zone_key)} wurde gestartet (Stufe ${data.level ?? '?'}).**`;
    else if (data.status === 'resolved' || data.result) text = `💀 **Heist ${zone(data.zone_key)} wurde beendet: ${data.result || data.status}.**`;
    else if (data.status) text = `💀 **Heist ${zone(data.zone_key)} ist jetzt „${data.status}“.**`;
  } else if (table === 'profiles') {
    if (op === 'INSERT') text = `🟢 **${actor} hat sich registriert.**`;
    else {
      const changes: string[] = [];
      for (const key of ['money','reputation','level','xp','material','product','influence','hitmen','weapon_parts']) {
        if (oldD[key] !== undefined && newD[key] !== undefined && oldD[key] !== newD[key]) {
          const labels: Record<string,string> = {money:'Geld',reputation:'Reputation',level:'Level',xp:'XP',material:'Material',product:'Ware',influence:'Einfluss',hitmen:'Schläger',weapon_parts:'Waffenteile'};
          changes.push(`${labels[key]}: ${num(oldD[key])} → ${num(newD[key])}`);
        }
      }
      text = changes.length ? `📊 **${actor}: ${changes.join(', ')}.**` : `📝 **${actor} hat sein Profil geändert.**`;
    }
  } else if (table === 'mtrw_notifications') {
    text = data.message ? `📨 **${actor}: ${String(data.title || 'Benachrichtigung')} – ${String(data.message)}**` : `📨 **${actor} hat eine Benachrichtigung erhalten.**`;
  } else if (table === 'mtrw_raid_runtime') {
    text = `🚨 **${actor}: Razzia-Aktivität wurde aktualisiert.**`;
  } else {
    const action = op === 'INSERT' ? 'angelegt' : op === 'UPDATE' ? 'geändert' : 'gelöscht';
    text = `📝 **${actor} hat ${table || 'einen Datensatz'} ${action}.**`;
  }

  return (text || `📝 **${actor}: ${table || 'Spielereignis'} wurde aktualisiert.**`).slice(0, 1900);
}

async function sendDiscord(token: string, content: string) {
  const response = await fetch(`${DISCORD_API}/channels/${AUDIT_CHANNEL_ID}/messages`, {
    method: 'POST',
    headers: {'Authorization': `Bot ${token}`, 'Content-Type': 'application/json'},
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
    const result = await sendDiscord(botToken, await humanText(event, ctx));
    if (result.ok) await ctx.supabaseAdmin.from('mtrw_audit_events').update({discord_sent:true,discord_sent_at:new Date().toISOString(),discord_error:null}).eq('id',event.id);
    else await ctx.supabaseAdmin.from('mtrw_audit_events').update({discord_error:result.error ?? 'discord_send_failed'}).eq('id',event.id);
    return Response.json(result,{status:result.ok ? 200 : 502});
  })
};