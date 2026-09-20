-- MAFIVERA V4: family join mode and application decisions.

create or replace function public.mtrw_family_set_join_mode(p_family_id text,p_join_mode text)
returns json language plpgsql security definer set search_path=public as $function$
declare uid uuid:=auth.uid(); r text;
begin
 if uid is null then raise exception 'not_authenticated'; end if;
 if p_join_mode not in ('open','application') then raise exception 'invalid_join_mode'; end if;
 select role into r from public.mtrw_family_members where family_id=p_family_id and user_id=uid;
 if r is null or r not in ('Anführer','Ältester','Vize') then raise exception 'family_leadership_required'; end if;
 update public.mtrw_families set join_mode=p_join_mode,updated_at=now() where id=p_family_id;
 return json_build_object('success',true,'join_mode',p_join_mode);
end;
$function$;

create or replace function public.mtrw_family_application_list(p_family_id text)
returns table(id uuid,user_id uuid,status text,message text,created_at timestamptz,username text,mafia_name text,level integer)
language sql stable security definer set search_path=public
as $function$
 select a.id,a.user_id,a.status,a.message,a.created_at,p.username,p.mafia_name,p.level
 from public.mtrw_family_applications a left join public.profiles p on p.id=a.user_id
 where a.family_id=p_family_id and exists (
   select 1 from public.mtrw_family_members m
   where m.family_id=p_family_id and m.user_id=auth.uid() and m.role in ('Anführer','Ältester','Vize')
 ) order by a.created_at desc;
$function$;

create or replace function public.mtrw_family_application_decide(p_application_id uuid,p_accept boolean)
returns json language plpgsql security definer set search_path=public as $function$
declare uid uuid:=auth.uid(); a public.mtrw_family_applications; f public.mtrw_families; cnt integer;
begin
 if uid is null then raise exception 'not_authenticated'; end if;
 select * into a from public.mtrw_family_applications where id=p_application_id for update;
 if not found then raise exception 'application_not_found'; end if;
 select * into f from public.mtrw_families where id=a.family_id for update;
 if not exists(select 1 from public.mtrw_family_members where family_id=a.family_id and user_id=uid and role in ('Anführer','Ältester','Vize')) then raise exception 'family_leadership_required'; end if;
 if a.status<>'pending' then raise exception 'application_already_decided'; end if;
 if p_accept then
   if exists(select 1 from public.mtrw_family_members where user_id=a.user_id) then
     update public.mtrw_family_applications set status='rejected',decided_at=now(),decided_by=uid where id=a.id;
     raise exception 'applicant_already_in_family';
   end if;
   select count(*) into cnt from public.mtrw_family_members where family_id=a.family_id;
   if cnt>=f.member_cap then raise exception 'family_full'; end if;
   insert into public.mtrw_family_members(family_id,user_id,role) values(a.family_id,a.user_id,'Mitglied');
   update public.mtrw_family_applications set status='approved',decided_at=now(),decided_by=uid where id=a.id;
 else
   update public.mtrw_family_applications set status='rejected',decided_at=now(),decided_by=uid where id=a.id;
 end if;
 return json_build_object('success',true,'status',case when p_accept then 'approved' else 'rejected' end);
end;
$function$;

grant execute on function public.mtrw_family_set_join_mode(text,text) to authenticated;
grant execute on function public.mtrw_family_application_list(text) to authenticated;
grant execute on function public.mtrw_family_application_decide(uuid,boolean) to authenticated;