-- MAFIA – THE REAL WORLD
-- v0.3 Online Core

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  mafia_name text not null default 'Neue Familie',
  display_name text not null default 'Don',
  money bigint not null default 1000 check (money >= 0),
  reputation integer not null default 0 check (reputation >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.territories (
  id uuid primary key default gen_random_uuid(),
  zone_key text unique not null,
  owner_id uuid references public.profiles(id) on delete set null,
  claimed_at timestamptz,
  claim_lat double precision,
  claim_lng double precision
);

create index if not exists territories_owner_idx on public.territories(owner_id);

alter table public.profiles enable row level security;
alter table public.territories enable row level security;

create policy "profiles are readable by everyone"
on public.profiles for select
using (true);

create policy "users can create own profile"
on public.profiles for insert
with check (auth.uid() = id);

create policy "users can update own profile"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "territories are readable by everyone"
on public.territories for select
using (true);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, mafia_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', 'Don'),
    coalesce(new.raw_user_meta_data->>'mafia_name', 'Neue Familie')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Server-side territory claiming.
-- The client supplies a zone and GPS coordinates; the server validates
-- that the player is close enough to the center of the zone.
create or replace function public.claim_territory(
  p_zone_key text,
  p_lat double precision,
  p_lng double precision
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  existing_owner uuid;
  new_money bigint;
  new_rep integer;
  zone_lat double precision;
  zone_lng double precision;
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;

  if p_lat is null or p_lng is null or p_lat not between -90 and 90 or p_lng not between -180 and 180 then
    raise exception 'invalid_location';
  end if;

  -- Grid size matches the frontend prototype: 0.0025 degrees.
  zone_lat := (floor(p_lat / 0.0025) + 0.5) * 0.0025;
  zone_lng := (floor(p_lng / 0.0025) + 0.5) * 0.0025;

  -- Basic server-side proximity check. Roughly 250m latitude tolerance.
  if abs(p_lat - zone_lat) > 0.0020 or abs(p_lng - zone_lng) > 0.0030 then
    raise exception 'location_not_in_zone';
  end if;

  select owner_id into existing_owner
  from public.territories
  where zone_key = p_zone_key
  for update;

  if existing_owner is not null then
    raise exception 'territory_already_owned';
  end if;

  insert into public.territories(zone_key, owner_id, claimed_at, claim_lat, claim_lng)
  values (p_zone_key, uid, now(), p_lat, p_lng)
  on conflict (zone_key) do update
    set owner_id = excluded.owner_id,
        claimed_at = excluded.claimed_at,
        claim_lat = excluded.claim_lat,
        claim_lng = excluded.claim_lng
    where public.territories.owner_id is null;

  update public.profiles
  set money = money + 100,
      reputation = reputation + 10,
      updated_at = now()
  where id = uid
  returning money, reputation into new_money, new_rep;

  return json_build_object('success', true, 'money', new_money, 'reputation', new_rep);
end;
$$;

grant execute on function public.claim_territory(text,double precision,double precision) to authenticated;
