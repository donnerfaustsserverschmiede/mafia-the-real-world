-- MAFIVERA V1: player radar, social invites and background business tasks
-- This file mirrors the live migration applied to Supabase.

create table if not exists public.mtrw_social_friend_invites (
 id uuid primary key default gen_random_uuid(),
 from_user_id uuid not null references public.profiles(id) on delete cascade,
 to_user_id uuid not null references public.profiles(id) on delete cascade,
 status text not null default 'pending',
 created_at timestamptz not null default now(),
 responded_at timestamptz,
 unique(from_user_id,to_user_id)
);
alter table public.mtrw_social_friend_invites enable row level security;
drop policy if exists "friend_invites_own" on public.mtrw_social_friend_invites;
create policy "friend_invites_own" on public.mtrw_social_friend_invites for select to authenticated using (from_user_id=auth.uid() or to_user_id=auth.uid());

create table if not exists public.mtrw_family_invites (
 id uuid primary key default gen_random_uuid(),
 family_id text not null references public.mtrw_families(id) on delete cascade,
 inviter_id uuid not null references public.profiles(id) on delete cascade,
 invitee_id uuid not null references public.profiles(id) on delete cascade,
 status text not null default 'pending',
 created_at timestamptz not null default now(),
 responded_at timestamptz,
 unique(family_id,invitee_id)
);
alter table public.mtrw_family_invites enable row level security;
drop policy if exists "family_invites_own" on public.mtrw_family_invites;
create policy "family_invites_own" on public.mtrw_family_invites for select to authenticated using (inviter_id=auth.uid() or invitee_id=auth.uid());
grant select on public.mtrw_family_invites to authenticated;

create or replace function public.mtrw_nearby_players(p_radius_m integer default 500)
returns table(id uuid,username text,mafia_name text,level integer,xp bigint,lat double precision,lng double precision,distance_m double precision)
language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); me profiles; r double precision:=greatest(50,least(coalesce(p_radius_m,500),2000));
begin
 if uid is null then raise exception 'not_authenticated'; end if;
 select * into me from profiles where profiles.id=uid;
 if me.gps_lat is null or me.gps_lng is null then return; end if;
 return query
 select p.id,p.username,p.mafia_name,p.level,p.xp,p.gps_lat,p.gps_lng,
 6371000*2*asin(sqrt(power(sin(radians(p.gps_lat-me.gps_lat)/2),2)+cos(radians(me.gps_lat))*cos(radians(p.gps_lat))*power(sin(radians(p.gps_lng-me.gps_lng)/2),2))) distance_m
 from profiles p where p.id<>uid and p.gps_lat is not null and p.gps_lng is not null
 and 6371000*2*asin(sqrt(power(sin(radians(p.gps_lat-me.gps_lat)/2),2)+cos(radians(me.gps_lat))*cos(radians(p.gps_lat))*power(sin(radians(p.gps_lng-me.gps_lng)/2),2))) <= r
 order by distance_m;
end $$;
grant execute on function public.mtrw_nearby_players(integer) to authenticated;

create or replace function public.mtrw_send_friend_invite(p_user_id uuid)
returns json language plpgsql security definer set search_path=public as $
declare uid uuid:=auth.uid(); begin
 if uid is null then raise exception 'not_authenticated'; end if;
 if p_user_id is null or p_user_id=uid then raise exception 'invalid_target'; end if;
 if not exists(select 1 from profiles where id=p_user_id) then raise exception 'player_not_found'; end if;
 if exists(select 1 from mtrw_friendships where user_id=uid and friend_id=p_user_id)
    or exists(select 1 from mtrw_friendships where user_id=p_user_id and friend_id=uid) then raise exception 'already_friend'; end if;
 if exists(select 1 from mtrw_social_friend_invites where from_user_id=p_user_id and to_user_id=uid and status='pending') then raise exception 'incoming_friend_request_pending'; end if;
 insert into mtrw_social_friend_invites(from_user_id,to_user_id,status) values(uid,p_user_id,'pending')
 on conflict(from_user_id,to_user_id) do update set status='pending',responded_at=null,created_at=now();
 return json_build_object('success',true);
end $;
grant execute on function public.mtrw_send_friend_invite(uuid) to authenticated;

create or replace function public.mtrw_remove_friend(p_user_id uuid)
returns json language plpgsql security definer set search_path=public as $
declare uid uuid:=auth.uid(); begin
 if uid is null then raise exception 'not_authenticated'; end if;
 if p_user_id is null or p_user_id=uid then raise exception 'invalid_target'; end if;
 delete from mtrw_friendships where (user_id=uid and friend_id=p_user_id) or (user_id=p_user_id and friend_id=uid);
 update mtrw_social_friend_invites set status='rejected',responded_at=now()
 where ((from_user_id=uid and to_user_id=p_user_id) or (from_user_id=p_user_id and to_user_id=uid)) and status='pending';
 return json_build_object('success',true);
end $;
grant execute on function public.mtrw_remove_friend(uuid) to authenticated;

create or replace function public.mtrw_invite_nearby_to_family(p_user_id uuid)
returns json language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); fid text; begin
 if uid is null then raise exception 'not_authenticated'; end if;
 select family_id into fid from mtrw_family_members where user_id=uid limit 1;
 if fid is null then raise exception 'not_in_family'; end if;
 if p_user_id is null or p_user_id=uid then raise exception 'invalid_target'; end if;
 if not exists(select 1 from profiles where id=p_user_id) then raise exception 'player_not_found'; end if;
 if exists(select 1 from mtrw_family_members where family_id=fid and user_id=p_user_id) then raise exception 'already_family_member'; end if;
 insert into mtrw_family_invites(id,family_id,inviter_id,invitee_id,status,created_at) values(gen_random_uuid(),fid,uid,p_user_id,'pending',now())
 on conflict(family_id,invitee_id) do update set inviter_id=uid,status='pending',responded_at=null,created_at=now();
 return json_build_object('success',true);
end $$;
grant execute on function public.mtrw_invite_nearby_to_family(uuid) to authenticated;

alter table public.mtrw_business_tasks add column if not exists reward_xp bigint not null default 0;

create or replace function public.mafivera_process_business_tasks()
returns json language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); t mtrw_business_tasks; notes jsonb:='[]'::jsonb; begin
 if uid is null then raise exception 'not_authenticated'; end if;
 for t in select * from mtrw_business_tasks where user_id=uid and status='running' and finish_at<=now() order by finish_at for update loop
  update profiles set money=money+t.reward_money,material=least(5000,material+t.reward_material),reputation=reputation+t.reward_reputation,product=least(5000,product+t.reward_product),xp=xp+coalesce(t.reward_xp,0),updated_at=now() where id=uid;
  update mtrw_business_tasks set status='completed',collected_at=now() where id=t.id;
  notes:=notes||jsonb_build_object('title',t.title,'message',t.title||' wurde erfüllt. Belohnung: +'||t.reward_money||' $, +'||t.reward_material||' Material, +'||t.reward_reputation||' Ruf, +'||t.reward_product||' Produkte, +'||coalesce(t.reward_xp,0)||' XP.');
 end loop; return notes; end $$;
grant execute on function public.mafivera_process_business_tasks() to authenticated;

create or replace function public.mafivera_start_business_task(p_task_type text)
returns json language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); p profiles; active_count integer; cost bigint; dur integer; title text; rm bigint; rmat bigint; rrep integer; rprod bigint; rxp bigint; begin
 if uid is null then raise exception 'not_authenticated'; end if;
 select * into p from profiles where id=uid for update; if not found then raise exception 'profile_not_found'; end if;
 select count(*) into active_count from mtrw_business_tasks where user_id=uid and status='running'; if active_count>=3 then raise exception 'max_3_business_tasks'; end if;
 case lower(trim(p_task_type))
 when 'bribe' then title:='Leute bestechen'; cost:=250; dur:=1800; rm:=0; rmat:=0; rrep:=25; rprod:=0; rxp:=40;
 when 'gang_attack' then title:='Bandenangriff'; cost:=500; dur:=3600; rm:=1200; rmat:=100; rrep:=10; rprod:=0; rxp:=75;
 when 'smuggling' then title:='Schmuggelauftrag'; cost:=1000; dur:=7200; rm:=2500; rmat:=200; rrep:=20; rprod:=1; rxp:=120;
 when 'protection' then title:='Schutzgeld eintreiben'; cost:=750; dur:=5400; rm:=1800; rmat:=0; rrep:=15; rprod:=0; rxp:=90;
 else raise exception 'unknown_business_task'; end case;
 if p.money<cost then raise exception 'not_enough_money'; end if;
 update profiles set money=money-cost,updated_at=now() where id=uid;
 insert into mtrw_business_tasks(user_id,task_type,title,cost_money,reward_money,reward_material,reward_reputation,reward_product,reward_xp,started_at,finish_at,status)
 values(uid,lower(trim(p_task_type)),title,cost,rm,rmat,rrep,rprod,rxp,now(),now()+make_interval(secs=>dur),'running');
 return json_build_object('success',true,'task_type',lower(trim(p_task_type)),'title',title,'duration_seconds',dur,'reward_xp',rxp);
end $$;
grant execute on function public.mafivera_start_business_task(text) to authenticated;


-- Admin: return a selected player's GPS position for the map jump.
create or replace function public.mtrw_admin_player_location(p_user_id uuid)
returns table(lat double precision,lng double precision,accuracy double precision)
language sql security definer set search_path=public as $$
  select p.gps_lat,p.gps_lng,p.gps_accuracy
  from public.profiles p
  where p.id=p_user_id
    and public.mtrw_can_do('view_players');
$$;
grant execute on function public.mtrw_admin_player_location(uuid) to authenticated;


-- Live player markers: cache alliance membership so allied players can be highlighted on the map.
alter table public.mtrw_live_players add column if not exists alliance_id uuid;
create index if not exists idx_mtrw_live_players_alliance_id on public.mtrw_live_players(alliance_id);
