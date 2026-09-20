-- MAFIVERA: base storage is 10,000 Material + 10,000 Waffenteile.
-- Each finished warehouse level adds +1,000 capacity to both resources.
create or replace function public.mafivera_bootstrap()
returns json language plpgsql security definer set search_path=public as $function$
declare
  uid uuid:=auth.uid(); p public.profiles; elapsed numeric; rec_elapsed numeric;
  gain_money bigint:=0; gain_material bigint:=0; gain_rep bigint:=0; gain_product bigint:=0; gain_weapon_parts bigint:=0;
  produced bigint:=0; recruits bigint:=0; wh integer:=0; garrison_total bigint:=0; r public.world_territories; bt text; mult numeric;
  material_cap bigint:=10000; weapon_parts_cap bigint:=10000;
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  select * into p from public.profiles where id=uid for update;
  if not found then raise exception 'profile_not_found'; end if;
  elapsed:=greatest(0,least(120,extract(epoch from(now()-p.last_economy_at))/60));
  rec_elapsed:=greatest(0,least(1440,extract(epoch from(now()-p.last_recruit_at))/60));
  select coalesce(sum(garrison),0) into garrison_total from public.world_territories where owner_id=uid;
  select coalesce(sum(greatest(1,building_level)),0)::integer into wh
    from public.world_territories where owner_id=uid and building_type='warehouse'
      and (building_finish_at is null or building_finish_at<=now());
  material_cap:=10000+(wh*1000);
  weapon_parts_cap:=10000+(wh*1000);
  if elapsed>0 then
    for r in select * from public.world_territories where owner_id=uid loop
      if r.building_finish_at is not null and r.building_finish_at>now() then continue; end if;
      foreach bt in array coalesce(r.resources,array['material','money']::text[]) loop
        if bt='money' then
          mult:=case when r.building_type='money' then power(1.5,greatest(1,r.building_level)) else 1 end;
          gain_money:=gain_money+floor(2*mult*elapsed);
        elsif bt='material' then
          mult:=case when r.building_type='lab' then 1+0.05*greatest(1,r.building_level) else 1 end;
          gain_material:=gain_material+floor(1*mult*elapsed);
        elsif bt='reputation' then
          mult:=case when r.building_type='club' then power(1.5,greatest(1,r.building_level)) else 1 end;
          gain_rep:=gain_rep+floor(1*mult*elapsed);
        elsif bt='weapon_parts' then
          mult:=case when r.building_type='weapon_factory' then 1+0.05*greatest(1,r.building_level) else 1 end;
          gain_weapon_parts:=gain_weapon_parts+floor(1*mult*elapsed);
        end if;
      end loop;
    end loop;
  end if;
  for r in select * from public.world_territories where owner_id=uid and building_type='recruitment'
    and (building_finish_at is null or building_finish_at<=now()) loop
    produced:=produced+floor(rec_elapsed*60/recruit_intervals_seconds(greatest(1,least(10,r.building_level))));
  end loop;
  recruits:=least(5000,produced);
  update public.profiles set money=money+gain_money,material=least(material_cap,material+gain_material),
    product=least(5000+wh*1000,product+gain_product),weapon_parts=least(weapon_parts_cap,weapon_parts+gain_weapon_parts),
    reputation=reputation+gain_rep,influence=influence+gain_rep,hitmen=least(5000,hitmen+recruits),
    last_economy_at=now(),last_recruit_at=now(),updated_at=now() where id=uid;
  perform public.mtrw_level_up(uid);
  select * into p from public.profiles where id=uid;
  return json_build_object('profile',json_build_object('id',p.id,'username',p.username,'mafia_name',p.mafia_name,
    'money',p.money,'material',p.material,'material_cap',material_cap,'product',p.product,
    'weapon_parts',p.weapon_parts,'weapon_parts_cap',weapon_parts_cap,'reputation',p.reputation,'influence',p.influence,
    'hitmen',p.hitmen,'level',p.level,'xp',p.xp,'gps_lat',p.gps_lat,'gps_lng',p.gps_lng,'gps_accuracy',p.gps_accuracy,
    'territories',(select count(*) from world_territories where owner_id=uid),
    'warehouse_count',(select count(*) from world_territories where owner_id=uid and building_type='warehouse' and (building_finish_at is null or building_finish_at<=now())),
    'recruitment_centers',(select count(*) from world_territories where owner_id=uid and building_type='recruitment' and (building_finish_at is null or building_finish_at<=now())),
    'weapon_factories',(select count(*) from world_territories where owner_id=uid and building_type='weapon_factory' and (building_finish_at is null or building_finish_at<=now())),
    'garrison',garrison_total,'max_hitmen',500+(select count(*) from world_territories where owner_id=uid and building_type='recruitment')*100),
    'territories',(select coalesce(json_agg(x),'[]'::json) from(select wt.*,coalesce(pr.username,'Spieler') username from world_territories wt left join profiles pr on pr.id=wt.owner_id where wt.owner_id=uid)x));
end;
$function$;
grant execute on function public.mafivera_bootstrap() to authenticated;
