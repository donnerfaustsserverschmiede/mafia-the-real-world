-- MAFIVERA V4 mailbox: offline report, territory takeover and social pending requests
create or replace function public.mtrw_social_snapshot()
returns json language plpgsql security definer set search_path='public'
as $$
declare uid uuid:=auth.uid();
begin
 if uid is null then raise exception 'not_authenticated'; end if;
 return json_build_object(
  'friends',(select coalesce(json_agg(x order by x.username),'[]'::json) from (select p.id,p.username,p.mafia_name,p.level,p.reputation from mtrw_friendships f join profiles p on p.id=f.friend_id where f.user_id=uid)x),
  'sent',(select coalesce(json_agg(x order by x.created_at desc),'[]'::json) from (select i.id,i.code,i.status,i.created_at,i.accepted_at,p.username,p.mafia_name from mtrw_social_invites i left join profiles p on p.id=i.invited_user_id where i.inviter_id=uid)x),
  'received',(select coalesce(json_agg(x order by x.created_at desc),'[]'::json) from (select i.id,i.code,i.status,i.created_at,p.username,p.mafia_name from mtrw_social_invites i join profiles p on p.id=i.inviter_id where i.invited_user_id=uid)x),
  'friend_requests',(select coalesce(json_agg(x order by x.created_at desc),'[]'::json) from (select i.id,i.created_at,p.id as user_id,p.username,p.mafia_name,p.level from mtrw_social_friend_invites i join profiles p on p.id=i.from_user_id where i.to_user_id=uid and i.status='pending')x)
 );
end $$;

create or replace function public.mtrw_absence_report()
returns jsonb language plpgsql security definer set search_path=''
as $$
declare
 v_uid uuid:=auth.uid();v_now timestamptz:=now();v_last timestamptz;v_items jsonb:='[]'::jsonb;
 v_prod integer:=0;v_tasks integer:=0;v_friends integer:=0;v_trades integer:=0;v_buildings integer:=0;v_events integer:=0;
 v_recruits bigint:=0;v_alliance_name text;v_last_donation timestamptz;v_has_alliance boolean:=false;
 v_elapsed numeric:=0;v_money bigint:=0;v_material bigint:=0;v_weapon_parts bigint:=0;v_rep bigint:=0;r public.world_territories;bt text;mult numeric;
begin
 if v_uid is null then raise exception 'not_authenticated';end if;
 select p.last_seen_at,p.last_economy_at into v_last,v_elapsed from public.profiles p where p.id=v_uid for update;
 if v_last is null then v_last:=v_now-interval '1 hour';end if;
 select greatest(0,least(120,extract(epoch from(v_now-p.last_economy_at))/60)) into v_elapsed from public.profiles p where p.id=v_uid;
 for r in select * from public.world_territories where owner_id=v_uid loop
  if r.building_finish_at is not null and r.building_finish_at>v_now then continue;end if;
  foreach bt in array coalesce(r.resources,array['material','money']::text[]) loop
   if bt='money' then mult:=case when r.building_type='money' then power(1.5,greatest(1,r.building_level)) else 1 end;v_money:=v_money+floor(2*mult*v_elapsed);
   elsif bt='material' then mult:=case when r.building_type='lab' then 1+0.05*greatest(1,r.building_level) else 1 end;v_material:=v_material+floor(mult*v_elapsed);
   elsif bt='reputation' then mult:=case when r.building_type='club' then power(1.5,greatest(1,r.building_level)) else 1 end;v_rep:=v_rep+floor(mult*v_elapsed);
   elsif bt='weapon_parts' then mult:=case when r.building_type='weapon_factory' then 1+0.05*greatest(1,r.building_level) else 1 end;v_weapon_parts:=v_weapon_parts+floor(mult*v_elapsed);
   end if;
  end loop;
 end loop;
 select count(*) into v_prod from public.mtrw_production_jobs j where j.user_id=v_uid and j.finish_at>v_last and j.finish_at<=v_now;
 if v_prod>0 then v_items:=v_items||jsonb_build_array(jsonb_build_object('id','production-'||v_prod,'category','Produktion','icon','⚗️','tone','ready','title',case when v_prod=1 then 'Eine Produktion ist fertig' else v_prod||' Produktionen sind fertig' end,'text','Die fertigen Waren warten auf dich.'));end if;
 select count(*) into v_tasks from public.mtrw_business_tasks t where t.user_id=v_uid and t.finish_at>v_last and t.finish_at<=v_now;
 if v_tasks>0 then v_items:=v_items||jsonb_build_array(jsonb_build_object('id','tasks-'||v_tasks,'category','Aufträge','icon','📦','tone','ready','title',case when v_tasks=1 then 'Ein Auftrag ist fertig' else v_tasks||' Aufträge sind fertig' end,'text','Prüfe deine abgeschlossenen Geschäftsaufträge.'));end if;
 select count(*) into v_friends from public.mtrw_social_friend_invites f where f.to_user_id=v_uid and f.status='pending' and f.created_at>v_last;
 if v_friends>0 then v_items:=v_items||jsonb_build_array(jsonb_build_object('id','friends-'||v_friends,'category','Soziales','icon','👥','tone','info','title',case when v_friends=1 then 'Eine Freundschaftsanfrage ist eingegangen' else v_friends||' Freundschaftsanfragen sind eingegangen' end,'text','Neue Kontakte warten auf deine Antwort.'));end if;
 select count(*) into v_trades from public.mtrw_trade_offers o where o.buyer_id=v_uid and o.status='pending' and o.created_at>v_last and o.expires_at>v_now;
 if v_trades>0 then v_items:=v_items||jsonb_build_array(jsonb_build_object('id','trades-'||v_trades,'category','Handel','icon','🤝','tone','info','title',case when v_trades=1 then 'Ein Handelsangebot ist eingegangen' else v_trades||' Handelsangebote sind eingegangen' end,'text','Ein Angebot wartet auf deine Entscheidung.'));end if;
 select count(*) into v_buildings from public.world_territories w where w.owner_id=v_uid and w.building_finish_at>v_last and w.building_finish_at<=v_now;
 if v_buildings>0 then v_items:=v_items||jsonb_build_array(jsonb_build_object('id','buildings-'||v_buildings,'category','Ausbau','icon','⚙️','tone','ready','title',case when v_buildings=1 then 'Ein Ausbau ist fertig' else v_buildings||' Ausbauten sind fertig' end,'text','Neue Gebäude- oder Ausbaustufen stehen bereit.'));end if;
 select a.name,am.last_donation_at into v_alliance_name,v_last_donation from public.mtrw_alliance_members am join public.mtrw_alliances a on a.id=am.alliance_id where am.user_id=v_uid limit 1;
 v_has_alliance:=v_alliance_name is not null;
 if v_has_alliance and (v_last_donation is null or timezone('Europe/Berlin',v_last_donation)::date<timezone('Europe/Berlin',v_now)::date) then v_items:=v_items||jsonb_build_array(jsonb_build_object('id','alliance-donation','category','Allianz','icon','🛡️','tone','warning','title','Tagesspende ist offen','text','Dein Tagesbeitrag für „'||v_alliance_name||'“ kann geleistet werden.'));end if;
 select coalesce(sum(floor(greatest(0,extract(epoch from(v_now-p.last_recruit_at))/60.0)*60.0/public.recruit_intervals_seconds(greatest(1,least(10,w.building_level))))),0) into v_recruits from public.profiles p join public.world_territories w on w.owner_id=p.id where p.id=v_uid and w.building_type='recruitment' and (w.building_finish_at is null or w.building_finish_at<=v_now);
 if v_recruits>0 then v_items:=v_items||jsonb_build_array(jsonb_build_object('id','recruits-'||v_recruits,'category','Rekrutierung','icon','👤','tone','ready','title',v_recruits||' Schläger wurden ausgebildet','text','Deine Rekrutierungszentren haben während deiner Abwesenheit weitergearbeitet.'));end if;
 select count(*) into v_events from public.game_logs g where g.user_id=v_uid and g.created_at>v_last and g.created_at<=v_now;
 if v_events>0 then v_items:=v_items||coalesce((select jsonb_agg(jsonb_build_object('id','log-'||g.id,'category',g.category,'icon',case when g.category ilike '%kampf%' then '⚔️' when g.category ilike '%handel%' then '🤝' when g.category ilike '%allianz%' then '🛡️' else '📋' end,'tone','info','title',g.event,'text',coalesce(g.details->>'message','Ein Spielereignis wurde registriert.')) order by g.created_at desc) from (select * from public.game_logs where user_id=v_uid and created_at>v_last and created_at<=v_now order by created_at desc limit 10) g),'[]'::jsonb);end if;
 update public.profiles set last_seen_at=v_now,updated_at=v_now where id=v_uid;
 return jsonb_build_object('has_report',jsonb_array_length(v_items)>0 or v_money>0 or v_material>0 or v_weapon_parts>0 or v_rep>0,'since',v_last,'until',v_now,'item_count',jsonb_array_length(v_items),'items',v_items,'gains',jsonb_build_object('money',v_money,'material',v_material,'weapon_parts',v_weapon_parts,'reputation',v_rep));
end $$;

create or replace function public.mtrw_absence_report_notify()
returns jsonb language plpgsql security definer set search_path=''
as $$ declare r jsonb;uid uuid:=auth.uid();sid text;begin
 if uid is null then raise exception 'not_authenticated';end if;r:=public.mtrw_absence_report();
 if coalesce((r->>'has_report')::boolean,false) then sid:='absence-'||replace(coalesce(r->>'until',now()::text),':','');perform public.mtrw_notify_user(uid,'offline_report','Offline-Bericht','Während deiner Abwesenheit sind neue Ereignisse und Ressourcen angefallen.','offline_report',r,'mtrw_absence_report',sid,null);end if;return r;end $$;
grant execute on function public.mtrw_absence_report_notify() to authenticated;

create or replace function public.mtrw_territory_owner_notification() returns trigger language plpgsql security definer set search_path=''
as $$ begin
 if old.owner_id is distinct from new.owner_id then
  if old.owner_id is not null then perform public.mtrw_notify_user(old.owner_id,'territory_lost','Gebiet verloren','Das Gebiet „'||new.zone_key||'“ wurde dir abgenommen.','territory_result',jsonb_build_object('zone_key',new.zone_key,'result','lost'),'world_territories',new.zone_key||':lost:'||extract(epoch from now())::bigint,null);end if;
  if new.owner_id is not null then perform public.mtrw_notify_user(new.owner_id,'territory_captured','Gebiet erobert','Das Gebiet „'||new.zone_key||'“ gehört jetzt dir.','territory_result',jsonb_build_object('zone_key',new.zone_key,'result','won'),'world_territories',new.zone_key||':won:'||extract(epoch from now())::bigint,null);end if;
 end if;return new;end $$;
drop trigger if exists trg_mtrw_territory_owner_notification on public.world_territories;
create trigger trg_mtrw_territory_owner_notification after update of owner_id on public.world_territories for each row execute function public.mtrw_territory_owner_notification();
revoke execute on function public.mtrw_territory_owner_notification() from public,anon,authenticated;