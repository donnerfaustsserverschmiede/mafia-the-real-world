-- MAFIVERA V4: prevent missing logical map cells during hitman marches.
-- The client renders deterministic cells even when no row exists yet. Ensure the
-- server materializes that cell before any claim/attack march targets it.
create or replace function public.mafivera_march(p_target_zone_key text,p_count integer,purpose text)
returns json language plpgsql security definer set search_path=public
as $$
declare
  uid uuid:=auth.uid();
  h world_territories; t world_territories; target record;
  distance_km numeric; seconds integer; speed_kmh numeric:=30;
  nowt timestamptz:=now(); family_march integer:=0;
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  if p_count<1 then raise exception 'invalid_troops'; end if;
  if purpose not in ('attack','claim') then raise exception 'invalid_march_purpose'; end if;

  insert into world_territories(
    zone_key,owner_id,center_lat,center_lng,defense_points,garrison,defense_current,
    resources,building_type,building_level,claimed_at,updated_at
  )
  select p_target_zone_key,null,z.lat,z.lng,25,0,25,mafivera_resources(p_target_zone_key),null,1,null,now()
  from mafivera_zone_center(p_target_zone_key) z
  where not exists(select 1 from world_territories where zone_key=p_target_zone_key)
  on conflict(zone_key) do nothing;

  select * into t from world_territories where zone_key=p_target_zone_key for update;
  if not found then raise exception 'territory_not_found'; end if;
  if purpose='attack' and t.owner_id=uid then raise exception 'already_owned'; end if;
  if purpose='claim' and t.owner_id is not null then raise exception 'territory_already_owned'; end if;

  select * into h from world_territories
  where owner_id=uid and building_type='headquarters'
  limit 1 for update;
  if not found then raise exception 'headquarters_required'; end if;

  if (select hitmen from profiles where id=uid)<p_count then raise exception 'not_enough_hitmen'; end if;
  select march_speed into family_march from mtrw_family_effects(uid);

  select * into target from mafivera_zone_center(p_target_zone_key);
  distance_km:=6371*2*asin(sqrt(
    power(sin(radians((target.lat-h.center_lat)/2)),2)+
    cos(radians(h.center_lat))*cos(radians(target.lat))*
    power(sin(radians((target.lng-h.center_lng)/2)),2)
  ));
  seconds:=greatest(5,ceil(distance_km/speed_kmh*3600*(1-greatest(0,least(20,family_march))*0.05)));

  update profiles set hitmen=hitmen-p_count,updated_at=now() where id=uid;
  insert into mtrw_marches(
    user_id,source_zone_key,target_zone_key,troop_count,purpose,
    started_at,arrival_at,current_lat,current_lng,start_lat,start_lng,target_lat,target_lng
  ) values(
    uid,h.zone_key,p_target_zone_key,p_count,purpose,nowt,
    nowt+make_interval(secs=>seconds),h.center_lat,h.center_lng,
    h.center_lat,h.center_lng,target.lat,target.lng
  );

  return json_build_object('success',true,'marching',true,'arrival_at',nowt+make_interval(secs=>seconds),
    'travel_seconds',seconds,'distance_km',round(distance_km,3),'family_march_speed_level',family_march);
end;
$$;
