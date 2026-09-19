-- MAFIVERA: Waffenteile-basierte Waffenproduktion
-- 4 Waffenarten: Hieb/Stich, Handfeuerwaffen, kleine Langwaffen/MPs, Langwaffen.
-- Kosten, Produktionszeiten und Verkaufspreise sind zentral in mtrw_weapon_recipe definiert.

alter table public.mtrw_production_jobs
  add column if not exists resource_cost_type text not null default 'material';

update public.mtrw_production_jobs
set resource_cost_type=case when drug_type like 'weapon_%' then 'weapon_parts' else 'material' end
where resource_cost_type='material' and drug_type like 'weapon_%';

create or replace function public.mtrw_weapon_recipe(p_weapon_type text)
returns jsonb language sql immutable as $function$
  select case lower(p_weapon_type)
    when 'weapon_melee' then jsonb_build_object('name','Hieb- und Stichwaffen','parts',10,'seconds',30,'market_value',300,'unlock_level',0,'inventory_key','melee')
    when 'weapon_handgun' then jsonb_build_object('name','Handfeuerwaffen','parts',25,'seconds',60,'market_value',700,'unlock_level',0,'inventory_key','handguns')
    when 'weapon_smg' then jsonb_build_object('name','Kleine Langwaffen / Maschinenpistolen','parts',50,'seconds',120,'market_value',1400,'unlock_level',0,'inventory_key','smgs')
    when 'weapon_longarm' then jsonb_build_object('name','Langwaffen','parts',100,'seconds',240,'market_value',2200,'unlock_level',0,'inventory_key','longarms')
    else null end
$function$;

create or replace function public.mtrw_start_production(p_drug_type text,p_quantity integer)
returns jsonb language plpgsql security definer set search_path=public as $function$
declare u uuid:=auth.uid(); r jsonb; cost integer; seconds integer; slots integer; running integer; j uuid; factory_level integer:=0; lab_level integer:=0; is_weapon boolean:=false; resource text:='material';
begin
 if u is null then raise exception 'Nicht angemeldet.'; end if;
 if p_quantity<1 then raise exception 'Ungültige Menge.'; end if;
 is_weapon:=lower(p_drug_type) like 'weapon_%';
 if is_weapon then
   r:=public.mtrw_weapon_recipe(lower(p_drug_type)); if r is null then raise exception 'Unbekannte Waffenproduktion.'; end if;
   select coalesce(max(building_level),0) into factory_level from world_territories where owner_id=u and building_type='weapon_factory' and (building_finish_at is null or building_finish_at<=now());
   if factory_level<1 then raise exception 'Eine fertige Waffenfabrik wird benötigt.'; end if;
   cost:=(r->>'parts')::integer*p_quantity; resource:='weapon_parts'; seconds:=(r->>'seconds')::integer*p_quantity;
   seconds:=greatest(1,round(seconds/(1+0.05*greatest(0,least(20,factory_level)))::numeric)::integer);
   if (select weapon_parts from profiles where id=u)<cost then raise exception 'Nicht genug Waffenteile. Benötigt: %',cost; end if;
   update profiles set weapon_parts=weapon_parts-cost,updated_at=now() where id=u;
 else
   r:=public.mtrw_recipe(p_drug_type); if r is null then raise exception 'Unbekannte Droge.'; end if;
   slots:=public.mtrw_production_slots((select coalesce(level,0) from profiles where id=u));
   select count(*) into running from mtrw_production_jobs where user_id=u and status='running';
   if running>=slots then raise exception 'Alle Produktionsslots sind belegt (% Slots).',slots; end if;
   cost:=(r->>'material')::integer*p_quantity; seconds:=(r->>'seconds')::integer*p_quantity;
   select coalesce(max(building_level),0) into lab_level from world_territories where owner_id=u and building_type='lab' and (building_finish_at is null or building_finish_at<=now());
   seconds:=greatest(1,round(seconds/(1+0.05*greatest(0,least(20,lab_level)))::numeric)::integer);
   if (select material from profiles where id=u)<cost then raise exception 'Nicht genug Material. Benötigt: %',cost; end if;
   if (select product from profiles where id=u)+p_quantity>5000 then raise exception 'product_storage_full'; end if;
   update profiles set material=material-cost,updated_at=now() where id=u;
 end if;
 slots:=public.mtrw_production_slots((select coalesce(level,0) from profiles where id=u));
 select count(*) into running from mtrw_production_jobs where user_id=u and status='running';
 if running>=slots then raise exception 'Alle Produktionsslots sind belegt (% Slots).',slots; end if;
 insert into mtrw_production_jobs(id,user_id,quantity,material_cost,started_at,finish_at,status,created_at,drug_type,recipe_key,resource_cost_type)
 values(gen_random_uuid(),u,p_quantity,cost,now(),now()+make_interval(secs=>seconds),'running',now(),lower(p_drug_type),lower(p_drug_type),resource) returning id into j;
 return jsonb_build_object('id',j,'cost',cost,'resource',resource,'finish_at',now()+make_interval(secs=>seconds),'slots',slots,'duration_seconds',seconds,'weapon_factory_level',factory_level,'weapon_speed_bonus_percent',case when is_weapon then factory_level*5 else 0 end);
end;
$function$;

create or replace function public.mtrw_cancel_production(p_job_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $function$
declare uid uuid:=auth.uid(); j mtrw_production_jobs; refund integer;
begin
 if uid is null then raise exception 'not_authenticated'; end if;
 select * into j from mtrw_production_jobs where id=p_job_id and user_id=uid for update;
 if not found then raise exception 'production_not_found'; end if;
 if j.status<>'running' then raise exception 'production_not_running'; end if;
 refund:=coalesce(j.material_cost,j.material_refund,0);
 if coalesce(j.resource_cost_type,'material')='weapon_parts' then update profiles set weapon_parts=weapon_parts+refund,updated_at=now() where id=uid;
 else update profiles set material=material+refund,updated_at=now() where id=uid; end if;
 update mtrw_production_jobs set status='cancelled',material_refund=refund,collected_at=now() where id=j.id;
 return jsonb_build_object('success',true,'id',j.id,'refund',refund,'resource',coalesce(j.resource_cost_type,'material'));
end;
$function$;

create or replace function public.mtrw_complete_production(p_job_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $function$
declare u uuid:=auth.uid(); j record; xp_gain bigint; r jsonb; key text;
begin
 select * into j from mtrw_production_jobs where id=p_job_id and user_id=u for update;
 if not found then raise exception 'Produktion nicht gefunden.'; end if;
 if j.status<>'running' or j.finish_at>now() then raise exception 'Produktion noch nicht fertig.'; end if;
 if j.drug_type like 'weapon_%' then
   r:=public.mtrw_weapon_recipe(j.drug_type); if r is null then raise exception 'Unbekannte Waffenproduktion.'; end if;
   insert into mtrw_weapon_inventory(user_id) values(u) on conflict(user_id) do nothing;
   key:=r->>'inventory_key';
   execute format('update mtrw_weapon_inventory set %I=%I+$1,updated_at=now() where user_id=$2',key,key) using j.quantity,u;
   xp_gain:=greatest(1,j.quantity*10);
 else
   insert into mtrw_drug_inventory(user_id,drug_type,quantity) values(u,j.drug_type,j.quantity) on conflict(user_id,drug_type) do update set quantity=mtrw_drug_inventory.quantity+excluded.quantity,updated_at=now();
   update profiles set product=product+j.quantity,xp=xp+greatest(1,j.quantity*5),updated_at=now() where id=u;
   xp_gain:=greatest(1,j.quantity*5);
 end if;
 if j.drug_type like 'weapon_%' then update profiles set xp=xp+xp_gain,updated_at=now() where id=u; end if;
 update mtrw_production_jobs set status='completed',collected_at=now() where id=j.id;
 perform public.mtrw_level_up(u);
 return jsonb_build_object('quantity',j.quantity,'xp',xp_gain,'weapon',j.drug_type like 'weapon_%');
end;
$function$;
