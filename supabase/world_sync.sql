-- MAFIVERA V1 — shared world ownership + tactical capture
create table if not exists public.world_territories (
  zone_key text primary key,
  owner_id uuid references public.profiles(id) on delete set null,
  center_lat double precision not null,
  center_lng double precision not null,
  defense_points integer not null default 25 check (defense_points >= 1),
  garrison integer not null default 0 check (garrison >= 0),
  building_type text,
  building_defense integer not null default 0 check (building_defense >= 0),
  support_bonus numeric(6,3) not null default 0 check (support_bonus >= 0),
  claimed_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.world_territories add column if not exists building_type text;
alter table public.world_territories add column if not exists building_defense integer not null default 0;
alter table public.world_territories add column if not exists support_bonus numeric(6,3) not null default 0;
create index if not exists world_territories_owner_idx on public.world_territories(owner_id);
alter table public.world_territories enable row level security;
drop policy if exists world_territories_public_read on public.world_territories;
create policy world_territories_public_read on public.world_territories for select using (true);
grant select on public.world_territories to authenticated;

-- Existing territories are normalized to the new 25-point base.
update public.world_territories set defense_points=greatest(25,defense_points) where building_defense=0 and coalesce(support_bonus,0)=0;

create or replace function public.sync_world_territory(
  p_zone_key text,
  p_center_lat double precision,
  p_center_lng double precision,
  p_defense_points integer default 25,
  p_garrison integer default 0,
  p_building_type text default null,
  p_building_defense integer default 0,
  p_support_bonus numeric default 0
) returns json language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); r public.world_territories;
begin
 if uid is null then raise exception 'not_authenticated'; end if;
 if p_zone_key is null or p_center_lat not between -90 and 90 or p_center_lng not between -180 and 180 then raise exception 'invalid_territory'; end if;
 insert into public.world_territories(zone_key,owner_id,center_lat,center_lng,defense_points,garrison,building_type,building_defense,support_bonus,claimed_at,updated_at)
 values(p_zone_key,uid,p_center_lat,p_center_lng,greatest(25,coalesce(p_defense_points,25)),greatest(0,coalesce(p_garrison,0)),nullif(p_building_type,''),greatest(0,coalesce(p_building_defense,0)),greatest(0,coalesce(p_support_bonus,0)),now(),now())
 on conflict(zone_key) do update set defense_points=greatest(25,coalesce(excluded.defense_points,25)),garrison=greatest(0,excluded.garrison),building_type=excluded.building_type,building_defense=greatest(0,excluded.building_defense),support_bonus=greatest(0,excluded.support_bonus),updated_at=now() where public.world_territories.owner_id=uid;
 select * into r from public.world_territories where zone_key=p_zone_key;
 return json_build_object('success',true,'owned_by_me',r.owner_id=uid,'owner_id',r.owner_id,'defense_points',r.defense_points,'garrison',r.garrison,'building_type',r.building_type,'building_defense',r.building_defense,'support_bonus',r.support_bonus);
end;$$;
grant execute on function public.sync_world_territory(text,double precision,double precision,integer,integer,text,integer,numeric) to authenticated;

create or replace function public.claim_world_territory(
  p_zone_key text,
  p_center_lat double precision,
  p_center_lng double precision,
  p_defense_points integer default 25,
  p_garrison integer default 0
) returns json language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); r public.world_territories;
begin
 if uid is null then raise exception 'not_authenticated'; end if;
 insert into public.world_territories(zone_key,owner_id,center_lat,center_lng,defense_points,garrison,building_type,building_defense,support_bonus,claimed_at,updated_at)
 values(p_zone_key,uid,p_center_lat,p_center_lng,25,0,null,0,0,now(),now())
 on conflict(zone_key) do nothing;
 if not found then raise exception 'territory_already_owned'; end if;
 select * into r from public.world_territories where zone_key=p_zone_key;
 return json_build_object('success',true,'owner_id',r.owner_id,'defense_points',r.defense_points,'garrison',r.garrison);
end;$$;
grant execute on function public.claim_world_territory(text,double precision,double precision,integer,integer) to authenticated;

create or replace function public.update_world_defense(
  p_zone_key text,
  p_defense_points integer,
  p_garrison integer default 0,
  p_building_type text default null,
  p_building_defense integer default 0,
  p_support_bonus numeric default 0
) returns json language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); r public.world_territories;
begin
 if uid is null then raise exception 'not_authenticated'; end if;
 update public.world_territories set defense_points=greatest(25,p_defense_points),garrison=greatest(0,p_garrison),building_type=nullif(p_building_type,''),building_defense=greatest(0,p_building_defense),support_bonus=greatest(0,p_support_bonus),updated_at=now() where zone_key=p_zone_key and owner_id=uid returning * into r;
 if r.zone_key is null then raise exception 'territory_not_owned'; end if;
 return json_build_object('success',true,'defense_points',r.defense_points,'garrison',r.garrison,'building_type',r.building_type,'building_defense',r.building_defense,'support_bonus',r.support_bonus);
end;$$;
grant execute on function public.update_world_defense(text,integer,integer,text,integer,numeric) to authenticated;

create or replace function public.attack_world_territory(
  p_zone_key text,
  p_troops integer
) returns json language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); r public.world_territories; old_owner uuid; remaining_attack integer; killed_garrison integer; damage integer; remaining_defense integer; won boolean;
begin
 if uid is null then raise exception 'not_authenticated'; end if;
 if p_troops is null or p_troops < 1 then raise exception 'invalid_troops'; end if;
 select * into r from public.world_territories where zone_key=p_zone_key for update;
 if r.zone_key is null then raise exception 'territory_not_found'; end if;
 if r.owner_id=uid then raise exception 'already_owned'; end if;
 old_owner:=r.owner_id;
 -- One attacking thug = one attack point. Stationed defenders are defeated first, one-for-one.
 killed_garrison:=least(p_troops,r.garrison);
 remaining_attack:=p_troops-killed_garrison;
 remaining_defense:=r.defense_points;
 damage:=least(remaining_attack,remaining_defense);
 remaining_defense:=remaining_defense-damage;
 won:=remaining_defense<=0;
 if not won then
   update public.world_territories set garrison=greatest(0,r.garrison-killed_garrison),defense_points=remaining_defense,updated_at=now() where zone_key=p_zone_key;
   return json_build_object('success',false,'required_troops',r.garrison+r.defense_points,'used_troops',p_troops,'garrison_defeated',killed_garrison,'damage',damage,'owner_id',r.owner_id,'defense_points',remaining_defense,'garrison',greatest(0,r.garrison-killed_garrison));
 end if;
 -- Capture destroys the building and resets the field to a normal 25-point field.
 update public.world_territories set owner_id=uid,defense_points=25,garrison=0,building_type=null,building_defense=0,support_bonus=0,claimed_at=now(),updated_at=now() where zone_key=p_zone_key;
 return json_build_object('success',true,'owner_id',uid,'previous_owner_id',old_owner,'defense_points',25,'garrison',0,'building_destroyed',r.building_type is not null,'building_type',r.building_type);
end;$$;
grant execute on function public.attack_world_territory(text,integer) to authenticated;

alter table public.world_territories replica identity full;
DO $$ begin
  begin execute 'alter publication supabase_realtime add table public.world_territories'; exception when duplicate_object then null; when undefined_object then null; end;
END $$;
