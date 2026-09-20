-- MAFIVERA V4 persistent offline mailbox
create table if not exists public.mtrw_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null,
  title text not null,
  message text not null,
  action_type text,
  action_data jsonb not null default '{}'::jsonb,
  source_type text not null,
  source_id text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  resolved_at timestamptz,
  expires_at timestamptz
);

create unique index if not exists mtrw_notifications_dedupe_idx on public.mtrw_notifications(user_id,kind,source_type,source_id);
create index if not exists mtrw_notifications_user_created_idx on public.mtrw_notifications(user_id,created_at desc);
create index if not exists mtrw_notifications_user_unread_idx on public.mtrw_notifications(user_id,read_at,created_at desc);

alter table public.mtrw_notifications enable row level security;
drop policy if exists mtrw_notifications_select_own on public.mtrw_notifications;
create policy mtrw_notifications_select_own on public.mtrw_notifications for select to authenticated using ((select auth.uid())=user_id);
revoke insert,update,delete on public.mtrw_notifications from anon,authenticated;
grant select on public.mtrw_notifications to authenticated;

create or replace function public.mtrw_notify_user(
 p_user_id uuid,p_kind text,p_title text,p_message text,
 p_action_type text default null,p_action_data jsonb default '{}'::jsonb,
 p_source_type text default 'system',p_source_id text default null,p_expires_at timestamptz default null
) returns uuid language plpgsql security definer set search_path=''
as $$
declare v_id uuid;
begin
 if p_user_id is null or p_source_id is null then return null; end if;
 insert into public.mtrw_notifications(user_id,kind,title,message,action_type,action_data,source_type,source_id,expires_at)
 values(p_user_id,p_kind,p_title,p_message,p_action_type,coalesce(p_action_data,'{}'::jsonb),p_source_type,p_source_id,p_expires_at)
 on conflict(user_id,kind,source_type,source_id) do update set
   title=excluded.title,message=excluded.message,action_type=excluded.action_type,
   action_data=excluded.action_data,expires_at=excluded.expires_at
 returning id into v_id;
 return v_id;
end $$;
revoke execute on function public.mtrw_notify_user(uuid,text,text,text,text,jsonb,text,text,timestamptz) from public,anon,authenticated;

create or replace function public.mtrw_my_notifications(p_limit integer default 100)
returns table(id uuid,kind text,title text,message text,action_type text,action_data jsonb,created_at timestamptz,read_at timestamptz,resolved_at timestamptz,expires_at timestamptz)
language sql security definer set search_path=''
as $$
 select n.id,n.kind,n.title,n.message,n.action_type,n.action_data,n.created_at,n.read_at,n.resolved_at,n.expires_at
 from public.mtrw_notifications n
 where n.user_id=(select auth.uid()) and (n.expires_at is null or n.expires_at>now())
 order by n.created_at desc limit greatest(1,least(coalesce(p_limit,100),200))
$$;
grant execute on function public.mtrw_my_notifications(integer) to authenticated;

create or replace function public.mtrw_notification_read(p_id uuid)
returns boolean language sql security definer set search_path=''
as $$ update public.mtrw_notifications set read_at=coalesce(read_at,now())
where id=p_id and user_id=(select auth.uid()) and resolved_at is null returning true $$;
grant execute on function public.mtrw_notification_read(uuid) to authenticated;

create or replace function public.mtrw_notification_resolve(p_id uuid)
returns boolean language sql security definer set search_path=''
as $$ update public.mtrw_notifications set read_at=coalesce(read_at,now()),resolved_at=coalesce(resolved_at,now())
where id=p_id and user_id=(select auth.uid()) returning true $$;
grant execute on function public.mtrw_notification_resolve(uuid) to authenticated;

create or replace function public.mtrw_family_application_notification() returns trigger
language plpgsql security definer set search_path=''
as $$
declare v_name text; v_user record;
begin
 select name into v_name from public.mtrw_families where id=new.family_id;
 if tg_op='INSERT' and new.status='pending' then
  for v_user in
   select distinct x.user_id from (
    select fm.user_id from public.mtrw_family_members fm where fm.family_id=new.family_id and fm.role in ('Anführer','Ältester','Vize')
    union select f.owner_id from public.mtrw_families f where f.id=new.family_id
   ) x loop
    perform public.mtrw_notify_user(v_user.user_id,'family_application','Neue Familienbewerbung',
      'Eine neue Bewerbung für '||coalesce(v_name,'deine Familie')||' wartet auf deine Entscheidung.',
      'family_application',jsonb_build_object('application_id',new.id,'family_id',new.family_id),
      'mtrw_family_applications',new.id::text,null);
  end loop;
 elsif tg_op='UPDATE' and old.status='pending' and new.status in ('approved','rejected') then
  perform public.mtrw_notify_user(new.user_id,
   case when new.status='approved' then 'family_application_approved' else 'family_application_rejected' end,
   case when new.status='approved' then 'Familienbewerbung angenommen' else 'Familienbewerbung abgelehnt' end,
   case when new.status='approved' then 'Deine Bewerbung bei '||coalesce(v_name,'der Familie')||' wurde angenommen.'
        else 'Deine Bewerbung bei '||coalesce(v_name,'der Familie')||' wurde abgelehnt.' end,
   'family_application_result',jsonb_build_object('application_id',new.id,'family_id',new.family_id,'status',new.status),
   'mtrw_family_applications',new.id::text,null);
 end if;
 return new;
end $$;
drop trigger if exists trg_mtrw_family_application_notification on public.mtrw_family_applications;
create trigger trg_mtrw_family_application_notification after insert or update of status on public.mtrw_family_applications for each row execute function public.mtrw_family_application_notification();

create or replace function public.mtrw_social_friend_notification() returns trigger
language plpgsql security definer set search_path=''
as $$
declare v_name text;
begin
 if tg_op='INSERT' and new.status='pending' then
  select coalesce(username,mafia_name,'Spieler') into v_name from public.profiles where id=new.from_user_id;
  perform public.mtrw_notify_user(new.to_user_id,'friend_request','Neue Freundschaftsanfrage',
   v_name||' möchte dich als Freund hinzufügen.','friend_request',jsonb_build_object('invite_id',new.id),
   'mtrw_social_friend_invites',new.id::text,null);
 end if; return new;
end $$;
drop trigger if exists trg_mtrw_social_friend_notification on public.mtrw_social_friend_invites;
create trigger trg_mtrw_social_friend_notification after insert on public.mtrw_social_friend_invites for each row execute function public.mtrw_social_friend_notification();

create or replace function public.mtrw_trade_notification() returns trigger
language plpgsql security definer set search_path=''
as $$
declare v_name text;
begin
 if tg_op='INSERT' and new.status='pending' then
  select coalesce(username,mafia_name,'Spieler') into v_name from public.profiles where id=new.seller_id;
  perform public.mtrw_notify_user(new.buyer_id,'trade_offer','Neues Handelsangebot',
   v_name||' bietet dir '||coalesce(new.item_quantity,0)::text||'× '||coalesce(new.item_type,'Ware')||
   ' für '||to_char(coalesce(new.money_amount,0),'FM999G999G999')||' $.',
   'trade_offer',jsonb_build_object('trade_id',new.id),'mtrw_trade_offers',new.id::text,new.expires_at);
 end if; return new;
end $$;
drop trigger if exists trg_mtrw_trade_notification on public.mtrw_trade_offers;
create trigger trg_mtrw_trade_notification after insert on public.mtrw_trade_offers for each row execute function public.mtrw_trade_notification();

create or replace function public.mtrw_family_invite_notification() returns trigger
language plpgsql security definer set search_path=''
as $$
declare v_name text;
begin
 if tg_op='INSERT' and new.status='pending' then
  select name into v_name from public.mtrw_families where id=new.family_id;
  perform public.mtrw_notify_user(new.invitee_id,'family_invite','Familieneinladung',
   'Du wurdest zu '||coalesce(v_name,'einer Familie')||' eingeladen.','family_invite',
   jsonb_build_object('invite_id',new.id,'family_id',new.family_id),'mtrw_family_invites',new.id::text,null);
 end if; return new;
end $$;
drop trigger if exists trg_mtrw_family_invite_notification on public.mtrw_family_invites;
create trigger trg_mtrw_family_invite_notification after insert on public.mtrw_family_invites for each row execute function public.mtrw_family_invite_notification();

create or replace function public.mtrw_sanction_notification() returns trigger
language plpgsql security definer set search_path=''
as $$
begin
 if tg_op='INSERT' then perform public.mtrw_notify_user(new.user_id,'sanction','Neue Sanktion',
  coalesce(new.reason,'Eine neue Sanktion wurde gegen deinen Spieler eingetragen.'),
  'sanction',jsonb_build_object('sanction_id',new.id),'mtrw_sanctions',new.id::text,new.expires_at);
 end if; return new;
end $$;
drop trigger if exists trg_mtrw_sanction_notification on public.mtrw_sanctions;
create trigger trg_mtrw_sanction_notification after insert on public.mtrw_sanctions for each row execute function public.mtrw_sanction_notification();

create or replace function public.mtrw_announcement_notification() returns trigger
language plpgsql security definer set search_path=''
as $$
declare p record;
begin
 if tg_op='INSERT' and new.active then
  for p in select id from public.profiles loop
   perform public.mtrw_notify_user(p.id,'announcement',new.title,new.message,'announcement',
    jsonb_build_object('announcement_id',new.id),'mtrw_announcements',new.id::text,new.expires_at);
  end loop;
 end if; return new;
end $$;
drop trigger if exists trg_mtrw_announcement_notification on public.mtrw_announcements;
create trigger trg_mtrw_announcement_notification after insert on public.mtrw_announcements for each row execute function public.mtrw_announcement_notification();

create or replace function public.mtrw_march_notification() returns trigger
language plpgsql security definer set search_path=''
as $$
declare v_title text;
begin
 if tg_op='UPDATE' and old.status is distinct from new.status and new.status is distinct from 'marching' then
  v_title=case when new.status in ('arrived','completed') then 'Marsch abgeschlossen'
    when new.status in ('battle','fighting') then 'Kampf begonnen'
    when new.status in ('failed','cancelled') then 'Marsch beendet' else 'Marschstatus aktualisiert' end;
  perform public.mtrw_notify_user(new.user_id,'march_'||new.status,v_title,
   'Dein Marsch '||coalesce(new.source_zone_key,'?')||' → '||coalesce(new.target_zone_key,'?')||
   ' hat den Status „'||coalesce(new.status,'unbekannt')||'“.','march_result',
   jsonb_build_object('march_id',new.id,'status',new.status,'result',coalesce(new.result,'{}'::jsonb)),
   'mtrw_marches',new.id::text||':'||new.status,null);
 end if; return new;
end $$;
drop trigger if exists trg_mtrw_march_notification on public.mtrw_marches;
create trigger trg_mtrw_march_notification after update of status on public.mtrw_marches for each row execute function public.mtrw_march_notification();

create or replace function public.mtrw_weapon_dealer_notification() returns trigger
language plpgsql security definer set search_path=''
as $$
begin
 if tg_op='INSERT' then perform public.mtrw_notify_user(new.user_id,'weapon_dealer','Waffenhändler ist da',
  'Der Waffenhändler ist jetzt für dich verfügbar.','weapon_dealer',jsonb_build_object('spawn_id',new.id),
  'mtrw_weapon_dealer_spawns',new.id::text,new.expires_at);
 end if; return new;
end $$;
drop trigger if exists trg_mtrw_weapon_dealer_notification on public.mtrw_weapon_dealer_spawns;
create trigger trg_mtrw_weapon_dealer_notification after insert on public.mtrw_weapon_dealer_spawns for each row execute function public.mtrw_weapon_dealer_notification();

create or replace function public.mtrw_dealer_notification() returns trigger
language plpgsql security definer set search_path=''
as $$
begin
 if tg_op='INSERT' then perform public.mtrw_notify_user(new.user_id,'dealer','Dealer verfügbar',
  'Dein Dealer ist wieder verfügbar.','dealer',jsonb_build_object('spawn_id',new.id),
  'mtrw_dealer_spawns',new.id::text,new.expires_at);
 end if; return new;
end $$;
drop trigger if exists trg_mtrw_dealer_notification on public.mtrw_dealer_spawns;
create trigger trg_mtrw_dealer_notification after insert on public.mtrw_dealer_spawns for each row execute function public.mtrw_dealer_notification();

create or replace function public.mtrw_notification_tick() returns integer
language plpgsql security definer set search_path=''
as $$
declare r record; v_count integer:=0;
begin
 for r in select id,user_id,recipe_key,drug_type from public.mtrw_production_jobs where status='running' and finish_at<=now() loop
  perform public.mtrw_notify_user(r.user_id,'production_ready','Produktion fertig',
   'Deine Produktion ist fertig und kann abgeholt werden.','production_ready',
   jsonb_build_object('job_id',r.id,'recipe_key',r.recipe_key,'drug_type',r.drug_type),
   'mtrw_production_jobs',r.id::text,null); v_count:=v_count+1;
 end loop;
 for r in select id,user_id,title,task_type from public.mtrw_business_tasks where status='running' and finish_at<=now() loop
  perform public.mtrw_notify_user(r.user_id,'business_task_ready','Aufgabe fertig',
   coalesce(r.title,'Deine Geschäftsaufgabe')||' ist fertig.','business_task_ready',
   jsonb_build_object('task_id',r.id,'task_type',r.task_type),'mtrw_business_tasks',r.id::text,null); v_count:=v_count+1;
 end loop;
 return v_count;
end $$;
revoke execute on function public.mtrw_notification_tick() from public,anon,authenticated;

do $$ begin
 if not exists(select 1 from cron.job where jobname='mtrw-notification-tick') then
  perform cron.schedule('mtrw-notification-tick','* * * * *','select public.mtrw_notification_tick()');
 end if;
exception when undefined_table then null; end $$;

do $$ begin
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='mtrw_notifications') then
  alter publication supabase_realtime add table public.mtrw_notifications;
 end if;
exception when undefined_object then null; end $$;
