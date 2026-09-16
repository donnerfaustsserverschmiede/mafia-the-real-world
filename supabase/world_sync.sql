-- MAFIVERA V1 — shared world ownership + attacks
create table if not exists public.world_territories (
  zone_key text primary key,
  owner_id uuid references public.profiles(id) on delete set null,
  center_lat double precision not null,
  center_lng double precision not null,
  defense_points integer not null default 10 check (defense_points >= 1),
  garrison integer not null default 0 check (garrison >= 0),
  claimed_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists world_territories_owner_idx on public.world_territories(owner_id);
alter table public.world_territories enable row level security;
drop policy if exists world_territories_public_read on public.world_territories;
create policy world_territories_public_read on public.world_territories for select using (true);
grant select on public.world_territories to authenticated;

create or replace function public.sync_world_territory(
  p_zone_key text,
  p_center_lat double precision,
  p_center_lng double precision,
  p_defense_points integer default 10,
  p_garrison integer default 0
) returns json language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); inserted boolean:=false; r public.world_territories;
begin
 if uid is null then raise exception 'not_authenticated'; end if;
 if p_zone_key is null or p_center_lat not between -90 and 90 or p_center_lng not between -180 and 180 then raise exception 'invalid_territory'; end if;
 insert into public.world_territories(zone_key,owner_id,center_lat,center_lng,defense_points,garrison,claimed_at,updated_at)
 values(p_zone_key,uid,p_center_lat,p_center_lng,greatest(1,coalesce(p_defense_points,10)),greatest(0,coalesce(p_garrison,0)),now(),now())
 on conflict(zone_key) do nothing;
 select * into r from public.world_territories where zone_key=p_zone_key;
 return json_build_object('success',true,'owned_by_me',r.owner_id=uid,'owner_id',r.owner_id,'defense_points',r.defense_points,'garrison',r.garrison);
end;$$;
grant execute on function public.sync_world_territory(text,double precision,double precision,integer,integer) to authenticated;

create or replace function public.claim_world_territory(
  p_zone_key text,
  p_center_lat double precision,
  p_center_lng double precision,
  p_defense_points integer default 10,
  p_garrison integer default 0
) returns json language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); r public.world_territories;
begin
 if uid is null then raise exception 'not_authenticated'; end if;
 if exists(select 1 from public.world_territories where zone_key=p_zone_key and owner_id is not null) then raise exception 'territory_already_owned'; end if;
 insert into public.world_territories(zone_key,owner_id,center_lat,center_lng,defense_points,garrison,claimed_at,updated_at)
 values(p_zone_key,uid,p_center_lat,p_center_lng,greatest(1,coalesce(p_defense_points,10)),greatest(0,coalesce(p_garrison,0)),now(),now())
 on conflict(zone_key) do update set owner_id=excluded.owner_id,defense_points=excluded.defense_points,garrison=excluded.garrison,updated_at=now() where public.world_territories.owner_id is null;
 if not found then raise exception 'territory_already_owned'; end if;
 select * into r from public.world_territories where zone_key=p_zone_key;
 return json_build_object('success',true,'owner_id',r.owner_id,'defense_points',r.defense_points,'garrison',r.garrison);
end;$$;
grant execute on function public.claim_world_territory(text,double precision,double precision,integer,integer) to authenticated;

create or replace function public.update_world_defense(
  p_zone_key text,
  p_defense_points integer,
  p_garrison integer default 0
) returns json language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); r public.world_territories;
begin
 if uid is null then raise exception 'not_authenticated'; end if;
 update public.world_territories set defense_points=greatest(1,p_defense_points),garrison=greatest(0,p_garrison),updated_at=now() where zone_key=p_zone_key and owner_id=uid returning * into r;
 if r.zone_key is null then raise exception 'territory_not_owned'; end if;
 return json_build_object('success',true,'defense_points',r.defense_points,'garrison',r.garrison);
end;$$;
grant execute on function public.update_world_defense(text,integer,integer) to authenticated;

create or replace function public.attack_world_territory(
  p_zone_key text,
  p_troops integer
) returns json language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); r public.world_territories; won boolean; old_owner uuid; remaining integer;
begin
 if uid is null then raise exception 'not_authenticated'; end if;
 if p_troops is null or p_troops < 1 then raise exception 'invalid_troops'; end if;
 select * into r from public.world_territories where zone_key=p_zone_key for update;
 if r.zone_key is null then raise exception 'territory_not_found'; end if;
 if r.owner_id=uid then raise exception 'already_owned'; end if;
 old_owner:=r.owner_id;
 won:=p_troops>=r.defense_points;
 if not won then return json_build_object('success',false,'required_troops',r.defense_points,'owner_id',r.owner_id,'defense_points',r.defense_points,'garrison',r.garrison); end if;
 remaining:=greatest(0,p_troops-r.defense_points);
 update public.world_territories set owner_id=uid,defense_points=10,garrison=remaining,claimed_at=now(),updated_at=now() where zone_key=p_zone_key;
 return json_build_object('success',true,'owner_id',uid,'previous_owner_id',old_owner,'defense_points',10,'garrison',remaining);
end;$$;
grant execute on function public.attack_world_territory(text,integer) to authenticated;

-- Enable database change streaming for the shared world. If the publication already contains the table, this statement may be skipped in the dashboard.
alter table public.world_territories replica identity full;
DO $$ begin
  begin execute 'alter publication supabase_realtime add table public.world_territories'; exception when duplicate_object then null; when undefined_object then null; end;
end $$;
