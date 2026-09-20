-- Admin map jump: fall back to the selected player's HQ/territory when GPS is unavailable.
drop function if exists public.mtrw_admin_player_location(uuid);

create function public.mtrw_admin_player_location(p_user_id uuid)
returns table(
  lat double precision,
  lng double precision,
  accuracy double precision,
  source text,
  zone_key text
)
language sql
security definer
set search_path=public
as $$
  select x.lat,x.lng,x.accuracy,x.source,x.zone_key
  from (
    select p.gps_lat as lat,p.gps_lng as lng,p.gps_accuracy as accuracy,
           'gps'::text as source,null::text as zone_key,1 as priority
    from public.profiles p
    where p.id=p_user_id and p.gps_lat is not null and p.gps_lng is not null
    union all
    select wt.center_lat,wt.center_lng,null::double precision,
           'headquarters'::text,wt.zone_key,2
    from public.world_territories wt
    where wt.owner_id=p_user_id and wt.building_type='headquarters'
      and wt.center_lat is not null and wt.center_lng is not null
    union all
    select wt.center_lat,wt.center_lng,null::double precision,
           'territory'::text,wt.zone_key,3
    from public.world_territories wt
    where wt.owner_id=p_user_id
      and wt.center_lat is not null and wt.center_lng is not null
  ) x
  where public.mtrw_can_do('view_players')
  order by x.priority
  limit 1;
$$;

grant execute on function public.mtrw_admin_player_location(uuid) to authenticated;
