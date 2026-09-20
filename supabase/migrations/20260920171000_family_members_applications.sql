-- MAFIVERA V4: family member visibility + join applications.

alter table public.mtrw_families
  add column if not exists join_mode text not null default 'open';

alter table public.mtrw_families drop constraint if exists mtrw_families_join_mode_check;
alter table public.mtrw_families add constraint mtrw_families_join_mode_check check (join_mode in ('open','application'));

create table if not exists public.mtrw_family_applications (
  id uuid primary key default gen_random_uuid(),
  family_id text not null references public.mtrw_families(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  message text,
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid references public.profiles(id),
  unique(family_id,user_id)
);

alter table public.mtrw_family_applications enable row level security;

drop policy if exists family_applications_own_select on public.mtrw_family_applications;
create policy family_applications_own_select on public.mtrw_family_applications
for select to authenticated using (user_id=auth.uid());

create or replace function public.mtrw_my_family_ids()
returns setof text language sql stable security definer set search_path=public
as $function$
  select family_id from public.mtrw_family_members where user_id=auth.uid();
$function$;

grant execute on function public.mtrw_my_family_ids() to authenticated;

drop policy if exists family_members_select_own on public.mtrw_family_members;
drop policy if exists family_members_select_family on public.mtrw_family_members;
create policy family_members_select_family on public.mtrw_family_members
for select to authenticated using (family_id in (select public.mtrw_my_family_ids()));

create or replace function public.mtrw_family_members_snapshot(p_family_id text)
returns table(user_id uuid, role text, family_points bigint, donated_total bigint, last_donation_at timestamptz, joined_at timestamptz, username text, mafia_name text, level integer)
language sql stable security definer set search_path=public
as $function$
  select m.user_id,m.role,m.family_points,m.donated_total,m.last_donation_at,m.joined_at,p.username,p.mafia_name,p.level
  from public.mtrw_family_members m left join public.profiles p on p.id=m.user_id
  where m.family_id=p_family_id and exists (
    select 1 from public.mtrw_family_members me where me.family_id=p_family_id and me.user_id=auth.uid()
  );
$function$;

grant execute on function public.mtrw_family_members_snapshot(text) to authenticated;

create or replace function public.mtrw_family_join(p_family_id text)
returns json language plpgsql security definer set search_path=public as $function$
declare uid uuid:=auth.uid(); f public.mtrw_families; cnt integer;
begin
 if uid is null then raise exception 'not_authenticated'; end if;
 select * into f from public.mtrw_families where id=p_family_id for update;
 if not found then raise exception 'family_not_found'; end if;
 if exists(select 1 from public.mtrw_family_members where user_id=uid) then raise exception 'already_in_family'; end if;
 if f.join_mode<>'open' then raise exception 'application_required'; end if;
 select count(*) into cnt from public.mtrw_family_members where family_id=p_family_id;
 if cnt>=f.member_cap then raise exception 'family_full'; end if;
 insert into public.mtrw_family_members(family_id,user_id,role) values(p_family_id,uid,'Mitglied');
 return json_build_object('success',true,'status','joined');
end;
$function$;

create or replace function public.mtrw_family_apply(p_family_id text,p_message text default null)
returns json language plpgsql security definer set search_path=public as $function$
declare uid uuid:=auth.uid(); f public.mtrw_families; cnt integer;
begin
 if uid is null then raise exception 'not_authenticated'; end if;
 select * into f from public.mtrw_families where id=p_family_id for update;
 if not found then raise exception 'family_not_found'; end if;
 if f.join_mode<>'application' then return public.mtrw_family_join(p_family_id); end if;
 if exists(select 1 from public.mtrw_family_members where user_id=uid) then raise exception 'already_in_family'; end if;
 select count(*) into cnt from public.mtrw_family_members where family_id=p_family_id;
 if cnt>=f.member_cap then raise exception 'family_full'; end if;
 insert into public.mtrw_family_applications(family_id,user_id,message,status)
 values(p_family_id,uid,left(nullif(trim(p_message),''),500),'pending')
 on conflict(family_id,user_id) do update set message=excluded.message,status='pending',created_at=now(),decided_at=null,decided_by=null;
 return json_build_object('success',true,'status','pending');
end;
$function$;

grant execute on function public.mtrw_family_apply(text,text) to authenticated;