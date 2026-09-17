-- MAFIVERA V1 production + social backend
-- Idempotent: safe to apply after world_production.sql.

create table if not exists public.mtrw_production_jobs (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  quantity integer not null check(quantity>0), material_cost integer not null check(material_cost>0),
  started_at timestamptz not null default now(), finish_at timestamptz not null,
  status text not null default 'running' check(status in ('running','completed','cancelled')),
  collected_at timestamptz, created_at timestamptz not null default now()
);
create index if not exists mtrw_production_jobs_user_status_idx on public.mtrw_production_jobs(user_id,status);
alter table public.mtrw_production_jobs enable row level security;
drop policy if exists mtrw_production_jobs_read_own on public.mtrw_production_jobs;
create policy mtrw_production_jobs_read_own on public.mtrw_production_jobs for select to authenticated using(user_id=auth.uid());

create table if not exists public.mtrw_social_invites (
  id uuid primary key default gen_random_uuid(), code text not null unique, inviter_id uuid not null references public.profiles(id) on delete cascade,
  invited_user_id uuid references public.profiles(id) on delete set null, status text not null default 'pending' check(status in ('pending','accepted','expired')),
  created_at timestamptz not null default now(), accepted_at timestamptz
);
create index if not exists mtrw_social_invites_inviter_idx on public.mtrw_social_invites(inviter_id,status);
create index if not exists mtrw_social_invites_invited_idx on public.mtrw_social_invites(invited_user_id,status);
alter table public.mtrw_social_invites enable row level security;
drop policy if exists mtrw_social_invites_read_own on public.mtrw_social_invites;
create policy mtrw_social_invites_read_own on public.mtrw_social_invites for select to authenticated using(inviter_id=auth.uid() or invited_user_id=auth.uid());

create table if not exists public.mtrw_friendships (
  user_id uuid not null references public.profiles(id) on delete cascade, friend_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(), primary key(user_id,friend_id), check(user_id<>friend_id)
);
alter table public.mtrw_friendships enable row level security;
drop policy if exists mtrw_friendships_read_own on public.mtrw_friendships;
create policy mtrw_friendships_read_own on public.mtrw_friendships for select to authenticated using(user_id=auth.uid() or friend_id=auth.uid());

create or replace function public.mafivera_start_production(p_quantity integer) returns json language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); p profiles; active mtrw_production_jobs; cost integer; seconds integer; j mtrw_production_jobs; labs integer; cap integer;
begin
 if uid is null then raise exception 'not_authenticated'; end if;
 if p_quantity is null or p_quantity<1 then raise exception 'invalid_production_amount'; end if;
 select * into p from profiles where id=uid for update; if not found then raise exception 'profile_not_found'; end if;
 select count(*) into labs from world_territories where owner_id=uid and building_type='lab' and (building_finish_at is null or building_finish_at<=now());
 if labs<1 then raise exception 'production_requires_lab'; end if;
 select * into active from mtrw_production_jobs where user_id=uid and status='running' order by created_at desc limit 1 for update;
 if active.id is not null then if active.finish_at<=now() then update mtrw_production_jobs set status='completed' where id=active.id; else raise exception 'production_already_running'; end if; end if;
 if p_quantity>floor(p.material/5) then raise exception 'insufficient_material'; end if;
 select 5000+count(*)*1000 into cap from world_territories where owner_id=uid and building_type='warehouse' and (building_finish_at is null or building_finish_at<=now());
 if p.product+p_quantity>cap then raise exception 'product_storage_full'; end if;
 cost:=p_quantity*5; seconds:=p_quantity*30;
 update profiles set material=material-cost,updated_at=now() where id=uid;
 insert into mtrw_production_jobs(user_id,quantity,material_cost,started_at,finish_at,status) values(uid,p_quantity,cost,now(),now()+make_interval(secs=>seconds),'running') returning * into j;
 return json_build_object('success',true,'job_id',j.id,'quantity',j.quantity,'material_cost',j.material_cost,'started_at',j.started_at,'finish_at',j.finish_at);
end;$$;
grant execute on function public.mafivera_start_production(integer) to authenticated;

create or replace function public.mafivera_collect_production() returns json language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); j mtrw_production_jobs; p profiles; cap integer;
begin
 if uid is null then raise exception 'not_authenticated'; end if;
 select * into j from mtrw_production_jobs where user_id=uid and status='running' order by created_at desc limit 1 for update;
 if j.id is null then return json_build_object('running',false,'completed',0); end if;
 if j.finish_at>now() then return json_build_object('running',true,'completed',0,'quantity',j.quantity,'started_at',j.started_at,'finish_at',j.finish_at); end if;
 select * into p from profiles where id=uid for update;
 select 5000+count(*)*1000 into cap from world_territories where owner_id=uid and building_type='warehouse' and (building_finish_at is null or building_finish_at<=now());
 if p.product+j.quantity>cap then return json_build_object('running',false,'completed',0,'blocked',true,'reason','product_storage_full','quantity',j.quantity,'finish_at',j.finish_at); end if;
 update profiles set product=product+j.quantity,updated_at=now() where id=uid;
 update mtrw_production_jobs set status='completed',collected_at=now() where id=j.id;
 return json_build_object('running',false,'completed',j.quantity,'job_id',j.id);
end;$$;
grant execute on function public.mafivera_collect_production() to authenticated;

create or replace function public.mtrw_create_invite() returns json language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); code text;
begin
 if uid is null then raise exception 'not_authenticated'; end if;
 code:=lower(substr(md5(random()::text||clock_timestamp()::text||uid::text),1,18));
 insert into mtrw_social_invites(code,inviter_id) values(code,uid);
 return json_build_object('success',true,'code',code);
end;$$;
grant execute on function public.mtrw_create_invite() to authenticated;

create or replace function public.mtrw_accept_invite(p_code text) returns json language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); i mtrw_social_invites; inv profiles; me profiles;
begin
 if uid is null then raise exception 'not_authenticated'; end if;
 select * into i from mtrw_social_invites where code=lower(trim(p_code)) for update;
 if not found then raise exception 'invite_not_found'; end if;
 if i.inviter_id=uid then raise exception 'cannot_accept_own_invite'; end if;
 if i.status='accepted' and i.invited_user_id<>uid then raise exception 'invite_already_used'; end if;
 if i.status='expired' then raise exception 'invite_expired'; end if;
 select * into inv from profiles where id=i.inviter_id; select * into me from profiles where id=uid;
 if i.status='pending' then update mtrw_social_invites set invited_user_id=uid,status='accepted',accepted_at=now() where id=i.id; insert into mtrw_friendships(user_id,friend_id) values(i.inviter_id,uid) on conflict do nothing; insert into mtrw_friendships(user_id,friend_id) values(uid,i.inviter_id) on conflict do nothing; end if;
 return json_build_object('success',true,'friend_id',i.inviter_id,'friend_username',inv.username,'friend_mafia_name',inv.mafia_name,'username',me.username);
end;$$;
grant execute on function public.mtrw_accept_invite(text) to authenticated;

create or replace function public.mtrw_social_snapshot() returns json language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid();
begin
 if uid is null then raise exception 'not_authenticated'; end if;
 return json_build_object(
 'friends',(select coalesce(json_agg(x order by x.username),'[]'::json) from (select p.id,p.username,p.mafia_name,p.level,p.reputation from mtrw_friendships f join profiles p on p.id=f.friend_id where f.user_id=uid)x),
 'sent',(select coalesce(json_agg(x order by x.created_at desc),'[]'::json) from (select i.id,i.code,i.status,i.created_at,i.accepted_at,p.username,p.mafia_name from mtrw_social_invites i left join profiles p on p.id=i.invited_user_id where i.inviter_id=uid)x),
 'received',(select coalesce(json_agg(x order by x.created_at desc),'[]'::json) from (select i.id,i.code,i.status,i.created_at,p.username,p.mafia_name from mtrw_social_invites i join profiles p on p.id=i.inviter_id where i.invited_user_id=uid)x));
end;$$;
grant execute on function public.mtrw_social_snapshot() to authenticated;