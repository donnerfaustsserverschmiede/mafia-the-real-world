create or replace function public.mafivera_resolve_attack(p_zone_key text,p_count integer,p_attacker uuid)
returns json language plpgsql security definer set search_path='public'
as $$
declare t world_territories;building_pts integer;max_defense integer;current_defense integer;attack_points integer;damage integer;required_troops integer;survivors integer;family_strength integer:=0;defender uuid;
begin
 select * into t from world_territories where zone_key=p_zone_key for update;
 if not found then raise exception 'territory_not_found'; end if;
 if t.owner_id=p_attacker then raise exception 'already_owned'; end if;
 defender:=t.owner_id;
 select troop_strength into family_strength from mtrw_family_effects(p_attacker);
 building_pts:=public.mtrw_building_defense_bonus(t.building_type,greatest(1,t.building_level));
 max_defense:=25+building_pts+(greatest(0,coalesce(t.garrison,0))*2);
 current_defense:=least(max_defense,greatest(0,coalesce(t.defense_current,max_defense)));
 attack_points:=floor(p_count*2*(1+greatest(0,least(20,family_strength))*0.05));
 if attack_points>current_defense then
  required_troops:=ceil(current_defense/(2*(1+greatest(0,least(20,family_strength))*0.05)));survivors:=greatest(0,p_count-required_troops);
  update world_territories set owner_id=p_attacker,defense_current=25,defense_points=25,defense_damaged_at=null,garrison=survivors,building_type=null,building_level=1,building_started_at=null,building_finish_at=null,building_defense=0,support_bonus=0,resources=mafivera_resources(p_zone_key),claimed_at=now(),updated_at=now() where zone_key=p_zone_key;
  update profiles set xp=xp+25,updated_at=now() where id=p_attacker;perform public.mtrw_level_up(p_attacker);
  return json_build_object('success',true,'captured',true,'survivors',survivors,'attack_points',attack_points,'defense_before',current_defense,'xp_gained',25,'family_troop_strength_level',family_strength,'defender_id',defender);
 end if;
 damage:=least(attack_points,current_defense);
 update world_territories set defense_current=greatest(0,current_defense-damage),defense_points=greatest(0,current_defense-damage),defense_damaged_at=now(),updated_at=now() where zone_key=p_zone_key;
 return json_build_object('success',false,'captured',false,'attack_points',attack_points,'damage',damage,'defense_left',greatest(0,current_defense-damage),'survivors',0,'xp_gained',0,'family_troop_strength_level',family_strength,'defender_id',defender);
end $$;

create or replace function public.mtrw_march_notification()
returns trigger language plpgsql security definer set search_path=''
as $$
declare v_title text;v_def uuid;v_won boolean;
begin
 if tg_op='UPDATE' and old.status is distinct from new.status and new.status is distinct from 'marching' then
  v_won:=coalesce((new.result->>'captured')::boolean,(new.result->>'success')::boolean,false);
  v_title:=case when new.purpose='attack' and new.status='completed' and v_won then 'Angriff gewonnen' when new.purpose='attack' and new.status in ('failed','cancelled') then 'Angriff verloren' when new.purpose='attack' and new.status='battle' then 'Angriff begonnen' when new.purpose='claim' and new.status='completed' then 'Gebietsübernahme erfolgreich' when new.purpose='claim' then 'Gebietsübernahme fehlgeschlagen' when new.status in ('arrived','completed') then 'Marsch abgeschlossen' when new.status in ('battle','fighting') then 'Kampf begonnen' when new.status in ('failed','cancelled') then 'Marsch beendet' else 'Marschstatus aktualisiert' end;
  perform public.mtrw_notify_user(new.user_id,case when new.purpose='attack' then 'attack_result' else 'march_'||new.status end,v_title,'Dein Marsch '||coalesce(new.source_zone_key,'?')||' → '||coalesce(new.target_zone_key,'?')||' hat den Status „'||coalesce(new.status,'unbekannt')||'“.','march_result',jsonb_build_object('march_id',new.id,'status',new.status,'result',coalesce(new.result,'{}'::jsonb)),'mtrw_marches',new.id::text||':'||new.status,null);
  if new.purpose='attack' and new.status in ('completed','failed') then
   begin v_def:=(new.result->>'defender_id')::uuid;exception when others then v_def:=null;end;
   if v_def is null then select owner_id into v_def from public.world_territories where zone_key=new.target_zone_key;end if;
   if v_def is not null and v_def<>new.user_id then
    perform public.mtrw_notify_user(v_def,case when v_won then 'defense_lost' else 'defense_won' end,case when v_won then 'Gebiet verloren' else 'Angriff abgewehrt' end,case when v_won then 'Dein Gebiet „'||coalesce(new.target_zone_key,'?')||'“ wurde erfolgreich angegriffen und übernommen.' else 'Der Angriff auf dein Gebiet „'||coalesce(new.target_zone_key,'?')||'“ wurde abgewehrt.' end,'defense_result',jsonb_build_object('march_id',new.id,'zone_key',new.target_zone_key,'won',not v_won,'result',coalesce(new.result,'{}'::jsonb)),'mtrw_marches',new.id::text||':defender:'||new.status,null);
   end if;
  end if;
 end if;return new;
end $$;
revoke execute on function public.mtrw_resolve_attack(text,integer,uuid) from public,anon,authenticated;
revoke execute on function public.mtrw_march_notification() from public,anon,authenticated;