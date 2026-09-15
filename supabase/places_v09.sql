-- MTRW v0.9 production patch
-- Run after supabase/places.sql and supabase/places_v08.sql

alter table public.game_places add column if not exists tier text not null default 'property';
alter table public.game_places add column if not exists influence_value integer not null default 1;
alter table public.game_places add column if not exists claim_reward_money bigint not null default 100;
alter table public.game_places add column if not exists claim_reward_reputation integer not null default 5;

create or replace function public.game_place_point_in(p_lat double precision,p_lng double precision,p_geometry jsonb)
returns boolean language plpgsql immutable as $$
declare
  a jsonb; b jsonb; x double precision; y double precision; xi double precision; yi double precision; xj double precision; yj double precision; inside boolean:=false; first_point boolean:=true; prev_lat double precision; prev_lng double precision; n integer:=0;
begin
  if p_geometry is null or jsonb_typeof(p_geometry)<>'array' then return false; end if;
  for a in select value from jsonb_array_elements(p_geometry) loop
    if a ? 'lat' and a ? 'lon' then
      n:=n+1; x:=(a->>'lon')::double precision; y:=(a->>'lat')::double precision;
      if first_point then prev_lat:=y; prev_lng:=x; first_point:=false; continue; end if;
      xi:=x; yi:=y; xj:=prev_lng; yj:=prev_lat;
      if ((yi>p_lat)<>(yj>p_lat)) and p_lng < (xj-xi)*(p_lat-yi)/nullif(yj-yi,0)+xi then inside:=not inside; end if;
      prev_lat:=y; prev_lng:=x;
    end if;
  end loop;
  return n>=3 and inside;
end;$$;

grant execute on function public.game_place_point_in(double precision,double precision,jsonb) to authenticated;

create or replace function public.claim_place(
  p_place_id text,p_osm_type text,p_osm_id bigint,p_name text,p_kind text,
  p_lat double precision,p_lng double precision,p_geometry jsonb
) returns json language plpgsql security definer set search_path=public as $$
declare
  uid uuid:=auth.uid(); new_money bigint; new_rep integer; v_tier text; v_influence integer; v_reward_money bigint; v_reward_rep integer; valid_here boolean:=false; c_lat double precision; c_lng double precision; g jsonb;
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  if p_lat is null or p_lng is null or p_lat not between -90 and 90 or p_lng not between -180 and 180 then raise exception 'invalid_location'; end if;
  if p_place_id is null or p_osm_type not in ('way','relation','node') or p_osm_id is null then raise exception 'invalid_place'; end if;
  if p_geometry is null or jsonb_typeof(p_geometry)<>'array' then raise exception 'invalid_geometry'; end if;

  v_tier:=public.game_place_tier(p_kind); v_influence:=public.game_place_influence(v_tier); v_reward_money:=public.game_place_money(v_tier); v_reward_rep:=public.game_place_rep(v_tier);
  if exists(select 1 from public.game_places where id=p_place_id and owner_id is not null) then raise exception 'place_already_owned'; end if;

  valid_here:=public.game_place_point_in(p_lat,p_lng,p_geometry);
  if not valid_here then
    select avg((x->>'lat')::double precision),avg((x->>'lon')::double precision) into c_lat,c_lng from jsonb_array_elements(p_geometry) x where x ? 'lat' and x ? 'lon';
    if c_lat is not null and sqrt(power((c_lat-p_lat)*111000,2)+power((c_lng-p_lng)*111000*cos(radians(p_lat)),2))<=150 then valid_here:=true; end if;
  end if;
  if not valid_here then raise exception 'not_inside_place'; end if;

  insert into public.game_places(id,osm_type,osm_id,name,kind,geometry,center_lat,center_lng,owner_id,claimed_at,claim_lat,claim_lng,tier,influence_value,claim_reward_money,claim_reward_reputation,updated_at)
  values(p_place_id,p_osm_type,p_osm_id,coalesce(nullif(p_name,''),'Unbenanntes Gebiet'),p_kind,p_geometry,c_lat,c_lng,uid,now(),p_lat,p_lng,v_tier,v_influence,v_reward_money,v_reward_rep,now())
  on conflict(id) do update set owner_id=excluded.owner_id,claimed_at=excluded.claimed_at,claim_lat=excluded.claim_lat,claim_lng=excluded.claim_lng,tier=excluded.tier,influence_value=excluded.influence_value,claim_reward_money=excluded.claim_reward_money,claim_reward_reputation=excluded.claim_reward_reputation,updated_at=now() where public.game_places.owner_id is null;
  if not found then raise exception 'place_already_owned'; end if;

  update public.profiles set money=money+v_reward_money,reputation=reputation+v_reward_rep,updated_at=now() where id=uid returning money,reputation into new_money,new_rep;
  if new_money is null then raise exception 'profile_not_found'; end if;
  return json_build_object('success',true,'money',new_money,'reputation',new_rep,'tier',v_tier,'influence',v_influence,'reward_money',v_reward_money,'reward_reputation',v_reward_rep);
end;$$;

grant execute on function public.claim_place(text,text,bigint,text,text,double precision,double precision,jsonb) to authenticated;
