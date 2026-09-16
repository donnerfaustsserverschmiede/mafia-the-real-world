-- MAFIVERA V1: recruitment production starts when the recruitment building is actually finished, not when construction starts.
create or replace function public.mafivera_bootstrap() returns json language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); p public.profiles; elapsed numeric; gain_money bigint:=0; gain_material bigint:=0; gain_rep bigint:=0; gain_product bigint:=0; produced bigint:=0; labs integer:=0; recruits bigint:=0; wh integer:=0; garrison_total bigint:=0; r public.world_territories; bt text; mult numeric; batches bigint; need_xp bigint; recruit_start timestamptz;
begin
if uid is null then raise exception 'not_authenticated'; end if;select * into p from public.profiles where id=uid for update;if not found then raise exception 'profile_not_found';end if;
elapsed:=greatest(0,least(120,extract(epoch from(now()-p.last_economy_at))/60));select coalesce(sum(garrison),0) into garrison_total from public.world_territories where owner_id=uid;
if elapsed>0 then
 for r in select * from public.world_territories where owner_id=uid loop
  if r.building_finish_at is not null and r.building_finish_at>now() then continue; end if;
  foreach bt in array coalesce(r.resources,array['material','money']::text[]) loop
   if bt='money' then mult:=case when r.building_type='money' then power(1.5,greatest(1,r.building_level)) else 1 end;gain_money:=gain_money+floor(2*mult*elapsed);
   elsif bt='material' then gain_material:=gain_material+floor(1*case when r.building_type='warehouse' then 1.25 else 1 end*elapsed);
   elsif bt='reputation' then mult:=case when r.building_type='club' then power(1.5,greatest(1,r.building_level)) else 1 end;gain_rep:=gain_rep+floor(1*mult*elapsed);end if;
  end loop;
  if r.building_type='lab' then labs:=labs+greatest(1,r.building_level);end if;
  if r.building_type='warehouse' then wh:=wh+greatest(1,r.building_level);end if;
 end loop;
 if labs>0 then batches:=least(labs::bigint*floor(elapsed),floor((p.material+gain_material)/5));gain_product:=greatest(0,batches);gain_material:=gain_material-gain_product*5;end if;
end if;
for r in select * from public.world_territories where owner_id=uid and building_type='recruitment' and (building_finish_at is null or building_finish_at<=now()) loop
 recruit_start:=greatest(p.last_recruit_at,coalesce(r.building_finish_at,p.last_recruit_at));produced:=produced+floor(greatest(0,extract(epoch from(now()-recruit_start))/recruit_intervals_seconds(greatest(1,least(10,r.building_level)))));
end loop;
recruits:=least(5000,produced);
update public.profiles set money=money+gain_money,material=least(5000+wh*1000,material+gain_material),product=least(5000+wh*1000,product+gain_product),reputation=reputation+gain_rep,influence=influence+gain_rep,hitmen=least(5000,hitmen+recruits),last_economy_at=now(),last_recruit_at=now(),updated_at=now() where id=uid returning * into p;
need_xp:=50+p.level*25;while p.xp>=need_xp loop p.xp:=p.xp-need_xp;p.level:=p.level+1;need_xp:=50+p.level*25;end loop;
update public.profiles set level=p.level,xp=p.xp,updated_at=now() where id=uid returning * into p;
return json_build_object('profile',json_build_object('id',p.id,'username',p.username,'mafia_name',p.mafia_name,'money',p.money,'material',p.material,'product',p.product,'reputation',p.reputation,'influence',p.influence,'hitmen',p.hitmen,'level',p.level,'xp',p.xp,'gps_lat',p.gps_lat,'gps_lng',p.gps_lng,'gps_accuracy',p.gps_accuracy,'territories',(select count(*) from world_territories where owner_id=uid),'warehouse_count',(select count(*) from world_territories where owner_id=uid and building_type='warehouse' and (building_finish_at is null or building_finish_at<=now())),'recruitment_centers',(select count(*) from world_territories where owner_id=uid and building_type='recruitment' and (building_finish_at is null or building_finish_at<=now())),'garrison',garrison_total,'max_hitmen',500+(select count(*) from world_territories where owner_id=uid and building_type='recruitment')*100),'territories',(select coalesce(json_agg(x),'[]'::json) from(select wt.*,coalesce(pr.username,'Spieler') username from world_territories wt left join profiles pr on pr.id=wt.owner_id where wt.owner_id=uid)x));
end;$$;
