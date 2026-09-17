-- MAFIVERA: Gebäude abreißen + Gebiete verlassen
-- Gebäude: 50 % der insgesamt für die aktuelle Stufe investierten Baukosten zurück.
-- Gebiet verlassen: Gebiet wird frei, Gebäude gehen verloren, stationierte Schläger kehren zurück.

create or replace function public.mafivera_demolish_building(p_zone_key text) returns json language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); w world_territories; p profiles; base_cost bigint; total_spent bigint; refund bigint;
begin
 if uid is null then raise exception 'not_authenticated'; end if;
 select * into p from profiles where id=uid for update;
 select * into w from world_territories where zone_key=p_zone_key for update;
 if not found or w.owner_id<>uid then raise exception 'territory_not_owned'; end if;
 if w.building_type is null then raise exception 'no_building'; end if;
 base_cost:=case w.building_type when 'warehouse' then 800 when 'money' then 250 when 'club' then 750 when 'lab' then 500 when 'market' then 900 when 'watch' then 600 when 'hideout' then 1000 when 'recruitment' then 1000 else 0 end;
 if base_cost=0 then raise exception 'invalid_building'; end if;
 total_spent:=base_cost*((coalesce(w.building_level,1)*(coalesce(w.building_level,1)+1))/2);
 refund:=floor(total_spent*0.5);
 update profiles set money=money+refund,updated_at=now() where id=uid;
 update world_territories set building_type=null,building_level=1,building_started_at=null,building_finish_at=null,building_defense=0,support_bonus=0,defense_points=25,updated_at=now() where zone_key=p_zone_key;
 return json_build_object('success',true,'refund',refund,'total_spent',total_spent);
end; $$;
grant execute on function public.mafivera_demolish_building(text) to authenticated;

create or replace function public.mafivera_leave_territory(p_zone_key text) returns json language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); w world_territories; p profiles; returned_hitmen integer; had_building boolean;
begin
 if uid is null then raise exception 'not_authenticated'; end if;
 select * into p from profiles where id=uid for update;
 select * into w from world_territories where zone_key=p_zone_key for update;
 if not found or w.owner_id<>uid then raise exception 'territory_not_owned'; end if;
 returned_hitmen:=greatest(0,coalesce(w.garrison,0));
 had_building:=w.building_type is not null;
 update profiles set hitmen=hitmen+returned_hitmen,updated_at=now() where id=uid;
 update world_territories set owner_id=null,claimed_at=null,garrison=0,building_type=null,building_level=1,building_started_at=null,building_finish_at=null,building_defense=0,support_bonus=0,defense_points=25,updated_at=now() where zone_key=p_zone_key;
 return json_build_object('success',true,'returned_hitmen',returned_hitmen,'building_lost',had_building);
end; $$;
grant execute on function public.mafivera_leave_territory(text) to authenticated;
