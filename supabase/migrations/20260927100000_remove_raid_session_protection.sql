-- MAFIVERA: remove initial raid protection and increase raid frequency
create or replace function public.mtrw_raid_start_or_state()
returns jsonb
language plpgsql
security definer
set search_path=public
as $function$
declare
  uid uuid:=auth.uid();
  p record;
  active record;
  b record;
  z record;
  rt record;
  strength integer;
  raid_id uuid;
  spawn_chance double precision:=0.05;
  current_hour timestamptz:=date_trunc('hour',now());
begin
  if uid is null then raise exception 'not_authenticated'; end if;

  select * into active from public.mtrw_raids
  where user_id=uid and status='active'
  order by created_at desc limit 1;

  if found then
    if active.ends_at<=now() then
      if active.committed_hitmen*2 >= active.police_strength then
        update public.mtrw_raids set status='won',resolved_at=now(),result=jsonb_build_object('success',true) where id=active.id;
      else
        update public.mtrw_raids set status='lost',resolved_at=now(),result=jsonb_build_object('success',false) where id=active.id;
      end if;
      select * into active from public.mtrw_raids where id=active.id;
    end if;
    select * into z from public.world_territories where zone_key=active.zone_key;
    return jsonb_build_object('raid_id',active.id,'status',active.status,'zone_key',active.zone_key,
      'building_type',active.building_type,'building_level',active.building_level,
      'police_strength',active.police_strength,'committed_hitmen',active.committed_hitmen,
      'ends_at',active.ends_at,'lat',z.center_lat,'lng',z.center_lng,'result',active.result);
  end if;

  select * into p from public.profiles where id=uid;
  if p.last_seen_at is null or p.last_seen_at<=now()-interval '90 seconds' then
    return jsonb_build_object('active',false);
  end if;

  select * into rt from public.mtrw_raid_runtime where user_id=uid for update;
  if not found then
    insert into public.mtrw_raid_runtime(user_id,session_started_at,last_check_at,hour_bucket,raids_this_hour)
    values(uid,now(),now(),current_hour,0) returning * into rt;
  elsif rt.last_check_at < now()-interval '5 minutes' then
    update public.mtrw_raid_runtime
    set session_started_at=now(),last_check_at=now(),hour_bucket=current_hour,raids_this_hour=0,updated_at=now()
    where user_id=uid returning * into rt;
  else
    if rt.hour_bucket<>current_hour then
      update public.mtrw_raid_runtime set hour_bucket=current_hour,raids_this_hour=0,last_check_at=now(),updated_at=now()
      where user_id=uid returning * into rt;
    else
      update public.mtrw_raid_runtime set last_check_at=now(),updated_at=now()
      where user_id=uid returning * into rt;
    end if;
  end if;

  if rt.raids_this_hour>=3 then return jsonb_build_object('active',false); end if;

  if exists(
    select 1 from public.mtrw_raids
    where user_id=uid and created_at>=current_hour
      and created_at>now()-interval '10 minutes'
  ) then return jsonb_build_object('active',false); end if;

  -- 5% chance per eligible 10-second check; no initial 5-minute session protection.
  if random()>spawn_chance then return jsonb_build_object('active',false); end if;

  select wt.* into b from public.world_territories wt
  where wt.owner_id=uid and wt.building_type is not null
    and wt.building_type<>'headquarters'
    and (wt.building_finish_at is null or wt.building_finish_at<=now())
  order by random() limit 1;

  if not found then return jsonb_build_object('active',false); end if;

  strength:=least(60,greatest(16,12+(greatest(1,b.building_level)*3)+floor(random()*9)::integer));

  insert into public.mtrw_raids(user_id,zone_key,building_type,building_level,police_strength,ends_at)
  values(uid,b.zone_key,b.building_type,greatest(1,b.building_level),strength,now()+interval '90 seconds')
  returning id into raid_id;

  update public.mtrw_raid_runtime set raids_this_hour=raids_this_hour+1,updated_at=now()
  where user_id=uid;

  perform public.mtrw_notify_user(uid,'raid','Die Polizei hat eine Razzia gegen dein Gebäude begonnen.',
    jsonb_build_object('raid_id',raid_id,'zone_key',b.zone_key,'lat',b.center_lat,'lng',b.center_lng,'building_type',b.building_type));

  return jsonb_build_object('raid_id',raid_id,'status','active','zone_key',b.zone_key,
    'building_type',b.building_type,'building_level',greatest(1,b.building_level),
    'police_strength',strength,'committed_hitmen',0,'ends_at',now()+interval '90 seconds',
    'lat',b.center_lat,'lng',b.center_lng);
end
$function$;
