create or replace function public.mtrw_family_invite_decide(p_invite_id uuid,p_accept boolean)
returns boolean language plpgsql security definer set search_path=''
as $$
declare v public.mtrw_family_invites%rowtype; v_cap integer; v_count integer;
begin
 select * into v from public.mtrw_family_invites
 where id=p_invite_id and invitee_id=(select auth.uid()) and status='pending' for update;
 if not found then raise exception 'family_invite_not_found'; end if;
 if p_accept then
  if exists(select 1 from public.mtrw_family_members where user_id=(select auth.uid())) then raise exception 'already_in_family'; end if;
  select member_cap into v_cap from public.mtrw_families where id=v.family_id for update;
  select count(*) into v_count from public.mtrw_family_members where family_id=v.family_id;
  if v_count>=coalesce(v_cap,10) then raise exception 'family_full'; end if;
  insert into public.mtrw_family_members(family_id,user_id,role) values(v.family_id,(select auth.uid()),'Mitglied');
  update public.mtrw_family_invites set status='accepted',responded_at=now() where id=v.id;
 else
  update public.mtrw_family_invites set status='rejected',responded_at=now() where id=v.id;
 end if;
 return true;
end $$;
grant execute on function public.mtrw_family_invite_decide(uuid,boolean) to authenticated;