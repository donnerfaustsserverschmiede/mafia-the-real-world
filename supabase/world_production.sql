-- MTRW GLOBAL WORLD CACHE
-- Run once in Supabase SQL Editor before deploying the world-tile Edge Function.
-- Requires PostGIS (Supabase Dashboard -> Database -> Extensions -> postgis).

create extension if not exists postgis with schema extensions;

create table if not exists public.world_tiles (
  tile_key text primary key,
  z smallint not null,
  x integer not null,
  y integer not null,
  bbox jsonb not null,
  osm_data jsonb not null default '[]'::jsonb,
  fetched_at timestamptz not null default now(),
  expires_at timestamptz not null default now(),
  fetching boolean not null default false,
  updated_at timestamptz not null default now()
);
create index if not exists world_tiles_expiry_idx on public.world_tiles(expires_at);
create index if not exists world_tiles_xyz_idx on public.world_tiles(z,x,y);
alter table public.world_tiles enable row level security;
drop policy if exists world_tiles_public_read on public.world_tiles;
create policy world_tiles_public_read on public.world_tiles for select to authenticated using (true);

-- Only the Edge Function/service role writes world cache rows.
revoke insert, update, delete on public.world_tiles from anon, authenticated;

-- Lightweight global player presence snapshot. This is NOT a GPS history table.
-- Clients should publish live positions through Supabase Realtime Broadcast;
-- this table is only for the last known online position when the game explicitly saves it.
create table if not exists public.player_presence (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  lat double precision not null,
  lng double precision not null,
  accuracy double precision,
  updated_at timestamptz not null default now()
);
create index if not exists player_presence_updated_idx on public.player_presence(updated_at desc);
alter table public.player_presence enable row level security;
drop policy if exists player_presence_read on public.player_presence;
create policy player_presence_read on public.player_presence for select to authenticated using (true);
drop policy if exists player_presence_own_upsert on public.player_presence;
create policy player_presence_own_upsert on public.player_presence for insert to authenticated with check (auth.uid()=user_id);
drop policy if exists player_presence_own_update on public.player_presence;
create policy player_presence_own_update on public.player_presence for update to authenticated using (auth.uid()=user_id) with check (auth.uid()=user_id);

grant select on public.world_tiles to authenticated;
grant select,insert,update on public.player_presence to authenticated;

-- Server-side geographic lookup for already cached OSM/game objects.
-- The client asks only for its current ~1 km world cell.
create or replace function public.get_world_tile(p_tile_key text)
returns json
language sql
stable
security invoker
set search_path=public
as $$
  select json_build_object(
    'tile_key', tile_key,
    'bbox', bbox,
    'osm_data', osm_data,
    'fetched_at', fetched_at,
    'expires_at', expires_at
  )
  from public.world_tiles
  where tile_key=p_tile_key;
$$;
grant execute on function public.get_world_tile(text) to authenticated;

-- Claiming remains in claim_place; this table only supplies the global OSM cache.
