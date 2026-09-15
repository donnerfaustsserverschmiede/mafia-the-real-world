import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const OVERPASS = 'https://overpass-api.de/api/interpreter';
const TILE_Z = 14;
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8' },
  });
}

function tileToBbox(z: number, x: number, y: number) {
  const n = 2 ** z;
  const lon1 = x / n * 360 - 180;
  const lon2 = (x + 1) / n * 360 - 180;
  const lat1 = Math.atan(Math.sinh(Math.PI * (1 - 2 * (y + 1) / n))) * 180 / Math.PI;
  const lat2 = Math.atan(Math.sinh(Math.PI * (1 - 2 * y / n))) * 180 / Math.PI;
  return { south: lat1, west: lon1, north: lat2, east: lon2 };
}

function pointToTile(lat: number, lng: number, z = TILE_Z) {
  const n = 2 ** z;
  const x = Math.floor((lng + 180) / 360 * n);
  const y = Math.floor((1 - Math.asinh(Math.tan(lat * Math.PI / 180)) / Math.PI) / 2 * n);
  return { z, x: Math.max(0, Math.min(n - 1, x)), y: Math.max(0, Math.min(n - 1, y)) };
}

function normalizeElement(e: any) {
  const tags = e.tags ?? {};
  const geometry = Array.isArray(e.geometry) ? e.geometry.map((p: any) => ({ lat: Number(p.lat), lon: Number(p.lon) })) : null;
  let center = e.center ? { lat: Number(e.center.lat), lon: Number(e.center.lon) } : null;
  if (!center && geometry?.length) {
    center = {
      lat: geometry.reduce((a: number, p: any) => a + p.lat, 0) / geometry.length,
      lon: geometry.reduce((a: number, p: any) => a + p.lon, 0) / geometry.length,
    };
  }
  if (!center) return null;
  let kind = tags.place || tags.building || tags.landuse || 'area';
  if (tags.place === 'city' || tags.place === 'town') kind = tags.place;
  else if (['suburb', 'neighbourhood', 'quarter'].includes(tags.place)) kind = tags.place;
  else if (['village', 'hamlet'].includes(tags.place)) kind = tags.place;
  else if (tags.landuse === 'residential' || tags.landuse === 'industrial') kind = tags.landuse;
  else if (tags.building) kind = tags.building;
  return {
    id: `${e.type}/${e.id}`,
    osm_type: e.type,
    osm_id: Number(e.id),
    name: tags.name || null,
    kind,
    center,
    geometry,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) return json({ error: 'server_not_configured' }, 500);

  const auth = req.headers.get('Authorization') || '';
  if (!auth.startsWith('Bearer ')) return json({ error: 'unauthorized' }, 401);
  const client = createClient(supabaseUrl, serviceKey, { global: { headers: { Authorization: auth } } });
  const { data: userData } = await client.auth.getUser();
  if (!userData.user) return json({ error: 'unauthorized' }, 401);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: 'invalid_json' }, 400); }
  const lat = Number(body?.lat), lng = Number(body?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -85.051129 || lat > 85.051129 || lng < -180 || lng > 180) return json({ error: 'invalid_location' }, 400);

  const t = pointToTile(lat, lng);
  const tileKey = `${t.z}/${t.x}/${t.y}`;
  const bbox = tileToBbox(t.z, t.x, t.y);
  const now = Date.now();

  const { data: cached } = await client.from('world_tiles').select('tile_key,bbox,osm_data,fetched_at,expires_at').eq('tile_key', tileKey).maybeSingle();
  if (cached && new Date(cached.expires_at).getTime() > now) return json({ source: 'cache', ...cached });

  // The Edge Function is the only layer that talks to Overpass. Clients never do.
  const q = `[out:json][timeout:12];(way[building](${bbox.south},${bbox.west},${bbox.north},${bbox.east});way[landuse~"^(residential|industrial)$"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});way[place~"^(neighbourhood|suburb|quarter|village|hamlet|town|city)$"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});relation[place~"^(neighbourhood|suburb|quarter|village|hamlet|town|city)$"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});node[place~"^(neighbourhood|suburb|quarter|village|hamlet|town|city)$"](${bbox.south},${bbox.west},${bbox.north},${bbox.east}););out center geom;`;

  const response = await fetch(OVERPASS, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', 'user-agent': 'MTRW/1.0 (world game map service)' },
    body: 'data=' + encodeURIComponent(q),
  });
  if (!response.ok) return json({ error: 'osm_unavailable', cached: cached ?? null }, 503);
  const osm = await response.json();
  const data = (osm.elements || []).map(normalizeElement).filter(Boolean);
  const expires = new Date(now + MAX_AGE_MS).toISOString();

  const { error: upsertError } = await client.from('world_tiles').upsert({
    tile_key: tileKey,
    z: t.z,
    x: t.x,
    y: t.y,
    bbox,
    osm_data: data,
    fetched_at: new Date(now).toISOString(),
    expires_at: expires,
    fetching: false,
    updated_at: new Date(now).toISOString(),
  }, { onConflict: 'tile_key' });
  if (upsertError) console.error('[MTRW] tile cache upsert', upsertError);

  return json({ source: 'osm', tile_key: tileKey, bbox, osm_data: data, fetched_at: new Date(now).toISOString(), expires_at: expires });
});
