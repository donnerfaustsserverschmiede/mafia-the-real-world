-- Admin map jump: use only the player's last known GPS position, including while offline.
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
  select p.gps_lat,p.gps_lng,p.gps_accuracy,
         'last_known_gps'::text,null::text
  from public.profiles p
  where p.id=p_user_id
    and p.gps_lat is not null
    and p.gps_lng is not null
    and public.mtrw_can_do('view_players')
  limit 1;
$$;

grant execute on function public.mtrw_admin_player_location(uuid) to authenticated;
