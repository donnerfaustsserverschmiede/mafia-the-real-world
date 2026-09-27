-- MAFIVERA family leadership / membership integrity
update public.mtrw_family_members
set role='Mitglied'
where family_id='ff930b58-4164-485a-afa5-76c80b5db817'
  and user_id='335ee27d-a31a-4216-bedb-4ff92e442d32'
  and role='Anführer';

create unique index if not exists mtrw_one_family_don
on public.mtrw_family_members(family_id) where role='Anführer';

create table if not exists public.mtrw_family_leadership_transfers (
  id uuid primary key default gen_random_uuid(),
  family_id text not null references public.mtrw_families(id) on delete cascade,
  from_user_id uuid not null,
  to_user_id uuid not null,
  status text not null default 'pending' check(status in ('pending','confirmed','cancelled')),
  created_at timestamptz not null default now(),
  confirmed_at timestamptz null
);
create unique index if not exists mtrw_one_pending_family_transfer
on public.mtrw_family_leadership_transfers(family_id) where status='pending';
alter table public.mtrw_family_leadership_transfers enable row level security;
revoke all on public.mtrw_family_leadership_transfers from anon, authenticated;

create or replace function public.mtrw_family_request_leadership_transfer(p_family_id text,p_user_id uuid) returns jsonb
language plpgsql security definer set search_path='public' as $$
declare uid uuid:=auth.uid(); owner_id uuid; target_role text; pending_id uuid;
begin
 if uid is null then raise exception 'not_authenticated'; end if;
 select owner_id into owner_id from public.mtrw_families where id=p_family_id for update;
 if owner_id is null then raise exception 'family_not_found'; end if;
 if uid<>owner_id then raise exception 'family_leader_required'; end if;
 if p_user_id=uid then raise exception 'family_leader_protected'; end if;
 select role into target_role from public.mtrw_family_members where family_id=p_family_id and user_id=p_user_id for update;
 if target_role is null then raise exception 'family_member_not_found'; end if;
 if target_role='Anführer' then raise exception 'already_family_leader'; end if;
 select id into pending_id from public.mtrw_family_leadership_transfers where family_id=p_family_id and status='pending' for update;
 if pending_id is not null then raise exception 'leadership_transfer_pending'; end if;
 insert into public.mtrw_family_leadership_transfers(family_id,from_user_id,to_user_id) values(p_family_id,uid,p_user_id) returning id into pending_id;
 return jsonb_build_object('success',true,'pending_id',pending_id,'to_user_id',p_user_id);
end; $$;

create or replace function public.mtrw_family_confirm_leadership_transfer(p_family_id text) returns jsonb
language plpgsql security definer set search_path='public' as $$
declare uid uuid:=auth.uid(); owner_id uuid; transfer_id uuid; target uuid;
begin
 if uid is null then raise exception 'not_authenticated'; end if;
 select owner_id into owner_id from public.mtrw_families where id=p_family_id for update;
 if owner_id is null then raise exception 'family_not_found'; end if;
 if uid<>owner_id then raise exception 'family_leader_required'; end if;
 select id,to_user_id into transfer_id,target from public.mtrw_family_leadership_transfers
 where family_id=p_family_id and status='pending' and from_user_id=uid order by created_at desc limit 1 for update;
 if transfer_id is null then raise exception 'leadership_transfer_not_found'; end if;
 if not exists(select 1 from public.mtrw_family_members where family_id=p_family_id and user_id=target) then raise exception 'family_member_not_found'; end if;
 update public.mtrw_family_members set role='Mitglied' where family_id=p_family_id and user_id=uid;
 update public.mtrw_family_members set role='Anführer' where family_id=p_family_id and user_id=target;
 update public.mtrw_families set owner_id=target where id=p_family_id;
 update public.mtrw_family_leadership_transfers set status='confirmed',confirmed_at=now() where id=transfer_id;
 return jsonb_build_object('success',true,'old_don',uid,'new_don',target);
end; $$;

create or replace function public.mtrw_family_set_member_role(p_family_id text,p_user_id uuid,p_role text) returns json
language plpgsql security definer set search_path='public' as $$
declare uid uuid:=auth.uid(); target_role text; family_owner uuid;
begin
 if uid is null then raise exception 'not_authenticated'; end if;
 if p_role not in ('Anführer','Vize','Ältester','Mitglied') then raise exception 'invalid_family_role'; end if;
 select owner_id into family_owner from public.mtrw_families where id=p_family_id for update;
 if family_owner is null then raise exception 'family_not_found'; end if;
 if uid<>family_owner then raise exception 'family_leader_required'; end if;
 if p_user_id=family_owner then raise exception 'family_leader_protected'; end if;
 select role into target_role from public.mtrw_family_members where family_id=p_family_id and user_id=p_user_id for update;
 if target_role is null then raise exception 'family_member_not_found'; end if;
 if p_role='Anführer' then
   perform public.mtrw_family_request_leadership_transfer(p_family_id,p_user_id);
   return json_build_object('success',true,'pending',true,'user_id',p_user_id,'role',target_role);
 end if;
 if not ((target_role='Mitglied' and p_role='Ältester') or (target_role='Ältester' and p_role in ('Mitglied','Vize')) or (target_role='Vize' and p_role='Ältester') or (target_role='Anführer' and p_role='Vize')) then raise exception 'invalid_rank_change'; end if;
 update public.mtrw_family_members set role=p_role where family_id=p_family_id and user_id=p_user_id;
 return json_build_object('success',true,'user_id',p_user_id,'old_role',target_role,'role',p_role);
end; $$;

create or replace function public.mtrw_family_leave() returns json
language plpgsql security definer set search_path='public' as $$
declare uid uuid:=auth.uid(); fid text; r text; cnt int;
begin
 if uid is null then raise exception 'not_authenticated'; end if;
 select family_id,role into fid,r from public.mtrw_family_members where user_id=uid for update;
 if fid is null then raise exception 'not_in_family'; end if;
 select count(*) into cnt from public.mtrw_family_members where family_id=fid;
 if r='Anführer' and cnt>1 then raise exception 'leader_must_transfer_first'; end if;
 delete from public.mtrw_family_members where family_id=fid and user_id=uid;
 if r='Anführer' then
   delete from public.mtrw_family_leadership_transfers where family_id=fid;
   delete from public.mtrw_families where id=fid;
 end if;
 return json_build_object('success',true);
end; $$;