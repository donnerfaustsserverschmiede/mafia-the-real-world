-- MTRW v0.7 REAL-WORLD AREAS
-- OSM-backed game areas: buildings, settlements, cities and land-use areas.
create table if not exists public.game_places (
  id text primary key,
  osm_type text not null,
  osm_id bigint not null,
  name text not null,
  kind text not null,
  geometry jsonb,
  center_lat double precision not null,
  center_lng double precision not null,
  owner_id uuid references public.profiles(id) on delete set null,
  claimed_at timestamptz,
  claim_lat double precision,
  claim_lng double precision,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists game_places_owner_idx on public.game_places(owner_id);
create index if not exists game_places_osm_idx on public.game_places(osm_type,osm_id);
alter table public.game_places enable row level security;
drop policy if exists game_places_public_read on public.game_places;
create policy game_places_public_read on public.game_places for select using (true);

create or replace function public.claim_place(
  p_place_id text,p_osm_type text,p_osm_id bigint,p_name text,p_kind text,
  p_lat double precision,p_lng double precision,p_geometry jsonb
) returns json language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); existing_owner uuid; new_money bigint; new_rep integer; d double precision;
begin
 if uid is null then raise exception 'not_authenticated'; end if;
 if p_lat is null or p_lng is null or p_lat not between -90 and 90 or p_lng not between -180 and 180 then raise exception 'invalid_location'; end if;
 if p_place_id is null or p_osm_type not in ('way','relation','node') or p_osm_id is null then raise exception 'invalid_place'; end if;
 select owner_id into existing_owner from public.game_places where id=p_place_id for update;
 if existing_owner is not null then raise exception 'place_already_owned'; end if;
 if p_geometry is not null and jsonb_array_length(p_geometry)>2 then
   select sqrt(power((center_lat-p_lat)*111000,2)+power((center_lng-p_lng)*111000*cos(radians(p_lat)),2)) into d
   from public.game_places where id=p_place_id;
 else d:=0; end if;
 if d is not null and d>150 then raise exception 'not_inside_place'; end if;
 insert into public.game_places(id,osm_type,osm_id,name,kind,geometry,center_lat,center_lng,owner_id,claimed_at,claim_lat,claim_lng,updated_at)
 values(p_place_id,p_osm_type,p_osm_id,coalesce(nullif(p_name,''),'Unbenanntes Gebiet'),p_kind,p_geometry,p_lat,p_lng,uid,now(),p_lat,p_lng,now())
 on conflict(id) do update set owner_id=excluded.owner_id,claimed_at=excluded.claimed_at,claim_lat=excluded.claim_lat,claim_lng=excluded.claim_lng,updated_at=now()
 where public.game_places.owner_id is null;
 update public.profiles set money=money+100,reputation=reputation+10,updated_at=now() where id=uid returning money,reputation into new_money,new_rep;
 return json_build_object('success',true,'money',new_money,'reputation',new_rep,'reward_money',100,'reward_reputation',10);
end;$$;
grant execute on function public.claim_place(text,text,bigint,text,text,double precision,double precision,jsonb) to authenticated;
