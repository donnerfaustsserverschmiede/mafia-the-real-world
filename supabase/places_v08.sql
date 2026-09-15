-- MTRW v0.8 REAL-WORLD AREA VALUES
-- Run after supabase/places.sql
-- Reclassifies real-world OSM areas into gameplay tiers with increasing influence/rewards.

alter table public.game_places add column if not exists tier text not null default 'property';
alter table public.game_places add column if not exists influence_value integer not null default 1;
alter table public.game_places add column if not exists claim_reward_money bigint not null default 100;
alter table public.game_places add column if not exists claim_reward_reputation integer not null default 10;

create or replace function public.game_place_tier(p_kind text)
returns text language sql immutable as $$
  select case
    when lower(coalesce(p_kind,'')) in ('city','town') then 'city'
    when lower(coalesce(p_kind,'')) in ('suburb','quarter','neighbourhood') then 'district'
    when lower(coalesce(p_kind,'')) in ('village','hamlet') then 'settlement'
    when lower(coalesce(p_kind,'')) in ('residential','industrial') then 'area'
    when lower(coalesce(p_kind,'')) in ('building','property') then 'property'
    else 'property'
  end;
$$;

create or replace function public.game_place_influence(p_tier text)
returns integer language sql immutable as $$
  select case lower(coalesce(p_tier,''))
    when 'city' then 1000
    when 'district' then 250
    when 'settlement' then 50
    when 'area' then 10
    else 1
  end;
$$;

create or replace function public.game_place_money(p_tier text)
returns bigint language sql immutable as $$
  select case lower(coalesce(p_tier,''))
    when 'city' then 5000
    when 'district' then 1500
    when 'settlement' then 500
    when 'area' then 200
    else 100
  end;
$$;

create or replace function public.game_place_rep(p_tier text)
returns integer language sql immutable as $$
  select case lower(coalesce(p_tier,''))
    when 'city' then 100
    when 'district' then 40
    when 'settlement' then 20
    when 'area' then 10
    else 5
  end;
$$;

update public.game_places
set tier=public.game_place_tier(kind),
    influence_value=public.game_place_influence(public.game_place_tier(kind)),
    claim_reward_money=public.game_place_money(public.game_place_tier(kind)),
    claim_reward_reputation=public.game_place_rep(public.game_place_tier(kind)),
    updated_at=now();

create or replace function public.claim_place(
  p_place_id text,p_osm_type text,p_osm_id bigint,p_name text,p_kind text,
  p_lat double precision,p_lng double precision,p_geometry jsonb
) returns json language plpgsql security definer set search_path=public as $$
declare
  uid uuid:=auth.uid(); existing_owner uuid; new_money bigint; new_rep integer;
  d double precision; v_tier text; v_influence integer; v_reward_money bigint; v_reward_rep integer;
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  if p_lat is null or p_lng is null or p_lat not between -90 and 90 or p_lng not between -180 and 180 then raise exception 'invalid_location'; end if;
  if p_place_id is null or p_osm_type not in ('way','relation','node') or p_osm_id is null then raise exception 'invalid_place'; end if;

  v_tier:=public.game_place_tier(p_kind);
  v_influence:=public.game_place_influence(v_tier);
  v_reward_money:=public.game_place_money(v_tier);
  v_reward_rep:=public.game_place_rep(v_tier);

  select owner_id into existing_owner from public.game_places where id=p_place_id for update;
  if existing_owner is not null then raise exception 'place_already_owned'; end if;

  -- For actual polygons, the frontend supplies the OSM geometry. The server additionally
  -- requires the player to be close to the mapped object's center to prevent arbitrary claims.
  select sqrt(power((center_lat-p_lat)*111000,2)+power((center_lng-p_lng)*111000*cos(radians(p_lat)),2))
    into d from public.game_places where id=p_place_id;
  if d is not null and d>150 then raise exception 'not_inside_place'; end if;

  insert into public.game_places(id,osm_type,osm_id,name,kind,geometry,center_lat,center_lng,owner_id,claimed_at,claim_lat,claim_lng,tier,influence_value,claim_reward_money,claim_reward_reputation,updated_at)
  values(p_place_id,p_osm_type,p_osm_id,coalesce(nullif(p_name,''),'Unbenanntes Gebiet'),p_kind,p_geometry,p_lat,p_lng,uid,now(),p_lat,p_lng,v_tier,v_influence,v_reward_money,v_reward_rep,now())
  on conflict(id) do update set owner_id=excluded.owner_id,claimed_at=excluded.claimed_at,claim_lat=excluded.claim_lat,claim_lng=excluded.claim_lng,tier=excluded.tier,influence_value=excluded.influence_value,claim_reward_money=excluded.claim_reward_money,claim_reward_reputation=excluded.claim_reward_reputation,updated_at=now()
  where public.game_places.owner_id is null;

  if not found then raise exception 'place_already_owned'; end if;

  update public.profiles set money=money+v_reward_money,reputation=reputation+v_reward_rep,updated_at=now() where id=uid returning money,reputation into new_money,new_rep;
  return json_build_object('success',true,'money',new_money,'reputation',new_rep,'tier',v_tier,'influence',v_influence,'reward_money',v_reward_money,'reward_reputation',v_reward_rep);
end;$$;

grant execute on function public.claim_place(text,text,bigint,text,text,double precision,double precision,jsonb) to authenticated;
