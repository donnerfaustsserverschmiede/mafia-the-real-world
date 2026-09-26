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
  return String(data?.username || data?.display_name || data?.name || fallback);
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
  if (!id) return 'SYSTEM';
  try {
    const { data: p } = await ctx.supabaseAdmin
      .from('profiles')
      .select('username')
      .eq('id', id)
      .maybeSingle();
    return nameOf(p, id.slice(0, 8));
  } catch {
    return id.slice(0, 8);
  }
}

async function humanText(event: any, ctx: any): Promise<string | null> {
  const oldD = event.old_data ?? {};
  const newD = event.new_data ?? {};
  const data = Object.keys(newD).length ? newD : oldD;
  const table = String(event.table_name ?? '');
  const op = String(event.operation ?? 'UNKNOWN');

  // Always identify the real player by UUID. Never use family name as player name.
  const actorId = event.actor_user_id || event.subject_user_id || data.user_id || data.owner_id || null;
  const actor = await resolvePlayer(ctx, actorId, data);
  let eventText = '';

  if (table === 'mtrw_marches') {
    const count = num(data.troop_count ?? data.requested_troops);
    const target = zone(data.target_zone_key);
    const p = purpose(data.purpose);
    eventText = op === 'INSERT'
      ? `hat ${count} Schläger ${p || 'losgeschickt'} nach ${target} geschickt`
      : `Marsch nach ${target} ist jetzt „${data.status ?? op}“`;
  } else if (table === 'mtrw_heist_attacks') {
    eventText = `hat ${num(data.requested_troops)} Schläger zu Heist ${zone(data.heist_id)} geschickt`;
  } else if (table === 'mtrw_heist_participants') {
    eventText = `nimmt mit ${num(data.troops_sent)} Schlägern an Heist ${zone(data.heist_id)} teil`;
  } else if (table === 'mtrw_heists') {
    eventText = op === 'INSERT'
      ? `Heist ${zone(data.zone_key)} wurde gestartet (Stufe ${data.level ?? '?'})`
      : `Heist ${zone(data.zone_key)} wurde aktualisiert: ${data.result || data.status || op}`;
  } else if (table === 'profiles' && op === 'INSERT') {
    eventText = 'hat sich registriert';
  } else if (table === 'profiles' && op === 'UPDATE') {
    // Ignore technical heartbeat/location writes. Only report actual gameplay/profile changes.
    const labels: Record<string,string> = {
      money:'Geld', reputation:'Reputation', level:'Level', xp:'XP',
      material:'Material', product:'Ware', influence:'Einfluss',
      hitmen:'Schläger', weapon_parts:'Waffenteile', username:'Spielername',
      preferred_language:'Sprache'
    };
    const changes = Object.keys(labels)
      .filter(key => oldD[key] !== undefined && newD[key] !== undefined && oldD[key] !== newD[key])
      .map(key => `${labels[key]}: ${num(oldD[key])} → ${num(newD[key])}`);
    if (!changes.length) return null;
    eventText = `Profil geändert – ${changes.join(', ')}`;
  } else if (table === 'player_presence' || table === 'mtrw_raid_runtime') {
    // Technical heartbeat/runtime records are kept in the database audit log,
    // but they do not create Discord spam.
    return null;
  } else if (table === 'mtrw_production_jobs') {
    const recipe = data.recipe_key || data.drug_type || 'Produktion';
    const quantity = data.quantity ?? data.amount ?? null;
    if (op === 'INSERT') {
      eventText = quantity != null
        ? `Produktion gestartet – ${num(quantity)}x ${recipe}`
        : `Produktion gestartet – ${recipe}`;
    } else if (op === 'UPDATE' && data.status === 'completed' && oldD.status !== 'completed') {
      eventText = quantity != null
        ? `Produktion fertig – ${num(quantity)}x ${recipe}`
        : `Produktion fertig – ${recipe}`;
    } else {
      return null;
    }
  } else if (table === 'dealer_sale') {
    eventText = `Verkauf beim Dealer – ${num(data.quantity)}x ${data.item} für ${num(data.total)} $`;
  } else if (table === 'market_sale') {
    eventText = `Verkauf – ${num(data.quantity)}x ${data.item} für ${num(data.total)} $`;
  } else if (table === 'mtrw_notifications') {
    // Notifications are not gameplay events. Only accept a fresh production-ready
    // notification whose referenced job really belongs to the same player and is completed.
    if (op !== 'INSERT' || String(data.kind || '') !== 'production_ready') return null;
    const action = data.action_data || {};
    const jobId = action.job_id || data.source_id;
    if (!jobId) return null;
    try {
      const { data: job } = await ctx.supabaseAdmin
        .from('mtrw_production_jobs')
        .select('user_id,quantity,recipe_key,drug_type,status,collected_at')
        .eq('id', jobId)
        .maybeSingle();
      if (!job || job.user_id !== data.user_id || job.status !== 'completed' || job.collected_at != null) return null;
      const produced = job.recipe_key || job.drug_type || action.recipe_key || action.drug_type || 'unbekannt';
      eventText = `Produktion fertig – ${num(job.quantity ?? action.quantity)}x ${produced}`;
    } catch {
      return null;
    }
  } else if (table === 'auth' && op === 'LOGIN') {
    eventText = 'hat sich eingeloggt';
  } else {
    const known: Record<string,string> = {
      'mtrw_drug_inventory': 'Inventar geändert',
      'mtrw_weapon_inventory': 'Waffeninventar geändert',
      'mtrw_friendships': op === 'INSERT' ? 'Freundschaft hinzugefügt' : 'Freundschaft geändert',
      'mtrw_family_members': op === 'INSERT' ? 'Familienmitglied hinzugefügt' : 'Familienmitglied geändert',
      'mtrw_alliances': op === 'INSERT' ? 'Allianz geändert' : 'Allianz geändert'
    };
    if (known[table]) eventText = known[table];
    else eventText = `${table || 'Datensatz'} wurde ${op === 'INSERT' ? 'angelegt' : op === 'UPDATE' ? 'geändert' : 'gelöscht'}`;
  }

  const isSystem = !actorId;
  const displayName = isSystem ? 'SYSTEM' : actor;
  const displayId = isSystem ? 'SYSTEM' : String(actorId);
  const eventTime = new Date(event.occurred_at || Date.now());
  const date = eventTime.toLocaleDateString('de-DE', { timeZone: 'Europe/Berlin' });
  const time = eventTime.toLocaleTimeString('de-DE', { timeZone: 'Europe/Berlin' });

  return `**Name:** ${displayName}\n**ID:** ${displayId}\n**Ereignis:** ${eventText}\n**Datum:** ${date}\n**Uhrzeit:** ${time} Uhr`.slice(0, 1900);
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
  fetch: withSupabase({auth:'none'}, async (req, ctx) => {
    const suppliedSecret = req.headers.get('x-mafivera-audit-secret') || '';
    const { data: storedSecret, error: secretError } = await ctx.supabaseAdmin.rpc('mtrw_get_discord_audit_webhook_secret');
    if (secretError || !storedSecret || suppliedSecret !== storedSecret) return Response.json({error:'unauthorized'},{status:401});
    if (req.method !== 'POST') return Response.json({error:'method_not_allowed'},{status:405});
    const botToken = Deno.env.get('DISCORD_BOT_TOKEN');
    if (!botToken) return Response.json({error:'DISCORD_BOT_TOKEN_not_configured'},{status:503});
    let body: any; try { body = await req.json(); } catch { return Response.json({error:'invalid_json'},{status:400}); }
    const event = body?.record ?? body?.event ?? body;
    if (!event?.id || !event?.operation || !event?.table_name) return Response.json({error:'invalid_audit_event'},{status:400});
    const message = await humanText(event, ctx);
    if (!message) {
      await ctx.supabaseAdmin.from('mtrw_audit_events').update({
        discord_sent: true,
        discord_sent_at: new Date().toISOString(),
        discord_error: null,
        metadata: { ...(event.metadata || {}), discord_skipped: true }
      }).eq('id', event.id);
      return Response.json({ok:true,skipped:true},{status:200});
    }
    const result = await sendDiscord(botToken, message);
    if (result.ok) await ctx.supabaseAdmin.from('mtrw_audit_events').update({discord_sent:true,discord_sent_at:new Date().toISOString(),discord_error:null}).eq('id',event.id);
    else await ctx.supabaseAdmin.from('mtrw_audit_events').update({discord_error:result.error ?? 'discord_send_failed'}).eq('id',event.id);
    return Response.json(result,{status:result.ok ? 200 : 502});
  })
};