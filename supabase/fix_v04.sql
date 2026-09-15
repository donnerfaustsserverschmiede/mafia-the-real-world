-- MAFIA – THE REAL WORLD
-- v0.4 database fixes
-- Run this once in Supabase SQL Editor after schema.sql.

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
  expected_zone text;
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;

  if p_lat is null or p_lng is null
     or p_lat not between -90 and 90
     or p_lng not between -180 and 180 then
    raise exception 'invalid_location';
  end if;

  -- The server calculates the authoritative grid cell itself.
  expected_zone := floor(p_lat / 0.0025)::bigint::text || ':' || floor(p_lng / 0.0025)::bigint::text;
  if p_zone_key is null or p_zone_key <> expected_zone then
    raise exception 'zone_mismatch';
  end if;

  -- Require the player to be reasonably inside the reported cell.
  if abs(p_lat - ((floor(p_lat / 0.0025) + 0.5) * 0.0025)) > 0.0020
     or abs(p_lng - ((floor(p_lng / 0.0025) + 0.5) * 0.0025)) > 0.0030 then
    raise exception 'location_not_in_zone';
  end if;

  -- Create the row if it does not exist, then lock it and decide ownership.
  insert into public.territories(zone_key, owner_id, claimed_at, claim_lat, claim_lng)
  values (expected_zone, null, null, null, null)
  on conflict (zone_key) do nothing;

  select owner_id into existing_owner
  from public.territories
  where zone_key = expected_zone
  for update;

  if existing_owner is not null then
    raise exception 'territory_already_owned';
  end if;

  update public.territories
  set owner_id = uid,
      claimed_at = now(),
      claim_lat = p_lat,
      claim_lng = p_lng
  where zone_key = expected_zone;

  update public.profiles
  set money = money + 100,
      reputation = reputation + 10,
      updated_at = now()
  where id = uid
  returning money, reputation into new_money, new_rep;

  if new_money is null then
    raise exception 'profile_not_found';
  end if;

  return json_build_object(
    'success', true,
    'money', new_money,
    'reputation', new_rep
  );
end;
$$;

grant execute on function public.claim_territory(text,double precision,double precision) to authenticated;
