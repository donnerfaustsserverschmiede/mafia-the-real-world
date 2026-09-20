-- MAFIVERA: separate five-slot caps for drug and weapon production.
create or replace function public.mtrw_start_production(p_drug_type text,p_quantity integer)
returns jsonb language plpgsql security definer set search_path=public as $function$
declare
 u uuid:=auth.uid(); r jsonb; cost integer; seconds integer; running integer; running_type integer; j uuid;
 factory_level integer:=0; lab_level integer:=0; is_weapon boolean:=false; resource text:='material';
begin
 if u is null then raise exception 'Nicht angemeldet.'; end if;
 if p_quantity<1 then raise exception 'Ungültige Menge.'; end if;
 is_weapon:=lower(p_drug_type) like 'weapon_%';
 if is_weapon then
   r:=public.mtrw_weapon_recipe(lower(p_drug_type)); if r is null then raise exception 'Unbekannte Waffenproduktion.'; end if;
   select coalesce(max(building_level),0) into factory_level from world_territories where owner_id=u and building_type='weapon_factory' and (building_finish_at is null or building_finish_at<=now());
   if factory_level<1 then raise exception 'Eine fertige Waffenfabrik wird benötigt.'; end if;
   cost:=(r->>'parts')::integer*p_quantity; resource:='weapon_parts';
   seconds:=greatest(1,round(((r->>'seconds')::numeric*p_quantity)/(1+0.05*greatest(0,least(20,factory_level))))::integer);
   if (select weapon_parts from profiles where id=u)<cost then raise exception 'Nicht genug Waffenteile. Benötigt: %',cost; end if;
 else
   r:=public.mtrw_recipe(p_drug_type); if r is null then raise exception 'Unbekannte Droge.'; end if;
   select coalesce(max(building_level),0) into lab_level from world_territories where owner_id=u and building_type='lab' and (building_finish_at is null or building_finish_at<=now());
   if lab_level<1 then raise exception 'Ein fertiges Chemielabor wird benötigt.'; end if;
   cost:=(r->>'material')::integer*p_quantity;
   seconds:=greatest(1,round(((r->>'seconds')::numeric*p_quantity)/(1+0.05*greatest(0,least(20,lab_level))))::integer);
   if (select material from profiles where id=u)<cost then raise exception 'Nicht genug Material. Benötigt: %',cost; end if;
   if (select product from profiles where id=u)+p_quantity>5000 then raise exception 'product_storage_full'; end if;
 end if;
 select count(*) into running from mtrw_production_jobs where user_id=u and status='running';
 select count(*) into running_type from mtrw_production_jobs where user_id=u and status='running' and ((is_weapon and drug_type like 'weapon_%') or ((not is_weapon) and (drug_type is null or drug_type not like 'weapon_%')));
 if running_type>=5 then
   if is_weapon then raise exception 'Alle 5 Waffenproduktionsslots sind belegt.'; else raise exception 'Alle 5 Drogenproduktionsslots sind belegt.'; end if;
 end if;
 if running>=10 then raise exception 'Alle Produktionsslots sind belegt.'; end if;
 if is_weapon then update profiles set weapon_parts=weapon_parts-cost,updated_at=now() where id=u; else update profiles set material=material-cost,updated_at=now() where id=u; end if;
 insert into mtrw_production_jobs(user_id,quantity,material_cost,started_at,finish_at,status,drug_type,recipe_key,resource_cost_type)
 values(u,p_quantity,cost,now(),now()+make_interval(secs=>seconds),'running',lower(p_drug_type),lower(p_drug_type),resource) returning id into j;
 return jsonb_build_object('id',j,'cost',cost,'resource',resource,'finish_at',now()+make_interval(secs=>seconds),'slots_per_type',5,'running_type',running_type+1,'total_slots',10,'duration_seconds',seconds);
end;
$function$;
grant execute on function public.mtrw_start_production(text,integer) to authenticated;
