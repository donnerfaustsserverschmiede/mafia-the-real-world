-- MAFIVERA V4: server-side hourly weapon dealer tick.
-- The client may still call mtrw_weapon_dealer_state(), but the spawn is
-- now materialized server-side during the random 10-minute hourly window.

create unique index if not exists mtrw_weapon_dealer_spawns_user_slot_uq
on public.mtrw_weapon_dealer_spawns(user_id, slot);

create or replace function public.mtrw_weapon_dealer_tick()
returns integer
language plpgsql
security definer
set search_path=public
as $function$
declare
  u record;
  hour_slot bigint;
  minute_of_hour integer;
  start_minute integer;
  wtype text;
  price bigint;
  qty integer;
  started timestamptz;
  until_at timestamptz;
  bearing double precision;
  dist double precision;
  off_lat double precision;
  off_lng double precision;
  trade integer;
  created_count integer:=0;
begin
  hour_slot:=floor(extract(epoch from now())/3600);
  minute_of_hour:=floor(mod(extract(epoch from now()),3600)/60);

  for u in
    select p.id, p.gps_lat, p.gps_lng
    from public.profiles p
    where p.gps_lat is not null and p.gps_lng is not null
      and exists (
        select 1
        from public.world_territories wt
        where wt.owner_id=p.id
          and wt.building_type='weapon_factory'
          and (wt.building_finish_at is null or wt.building_finish_at<=now())
      )
  loop
    start_minute:=mod(abs(hashtextextended(u.id::text||hour_slot::text,77)),51);

    if minute_of_hour >= start_minute and minute_of_hour < start_minute+10 then
      if not exists (
        select 1 from public.mtrw_weapon_dealer_spawns ws
        where ws.user_id=u.id and ws.slot=hour_slot
      ) then
        select coalesce(trade,0) into trade from public.mtrw_family_effects(u.id);

        wtype:=case mod(abs(hashtextextended(u.id::text||hour_slot::text,91)),4)
          when 0 then 'weapon_melee'
          when 1 then 'weapon_handgun'
          when 2 then 'weapon_smg'
          else 'weapon_longarm'
        end;

        price:=case wtype
          when 'weapon_melee' then 300
          when 'weapon_handgun' then 700
          when 'weapon_smg' then 1400
          else 2200
        end;
        price:=floor(price*(1+greatest(0,least(20,trade))*0.05));

        qty:=5+floor(random()*16)::integer;
        bearing:=mod(abs(hashtextextended(u.id::text||hour_slot::text,131)),6284)::double precision/1000.0;
        dist:=mod(abs(hashtextextended(u.id::text||hour_slot::text,143)),451);
        off_lat:=(dist*cos(bearing))/111320.0;
        off_lng:=(dist*sin(bearing))/(111320.0*greatest(0.2,cos(radians(u.gps_lat))));
        started:=to_timestamp(hour_slot*3600+start_minute*60);
        until_at:=started+interval '10 minutes';

        insert into public.mtrw_weapon_dealer_spawns(
          user_id,slot,lat,lng,weapon_type,price_per_unit,
          max_quantity,remaining_quantity,active_from,active_until
        )
        values(
          u.id,hour_slot,u.gps_lat+off_lat,u.gps_lng+off_lng,wtype,price,
          qty,qty,started,until_at
        )
        on conflict (user_id,slot) do nothing;

        if found then created_count:=created_count+1; end if;
      end if;
    end if;
  end loop;

  return created_count;
end;
$function$;

grant execute on function public.mtrw_weapon_dealer_tick() to service_role;

select cron.unschedule(jobid)
from cron.job
where jobname='mtrw-weapon-dealer-hourly';

select cron.schedule(
  'mtrw-weapon-dealer-hourly',
  '* * * * *',
  $$select public.mtrw_weapon_dealer_tick();$$
);
