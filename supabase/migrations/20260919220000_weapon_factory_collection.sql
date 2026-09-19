-- MAFIVERA: Waffenfabrik = Waffenteile-Sammelbonus
alter table public.profiles add column if not exists weapon_parts bigint not null default 0;

create or replace function public.mafivera_resources(p_zone_key text) returns text[] language sql immutable as $$
with m as (
 select (regexp_match(p_zone_key,'^z_(-?[0-9]+)_(-?[0-9]+)
), h as (
 select mod(abs(a[1]::bigint*73856093 + a[2]::bigint*19349663),100) as n from m
)
select case
 when n<5 then array['weapon_parts']::text[]
 when n<45 then array['money']::text[]
 when n<80 then array['material']::text[]
 else array['reputation']::text[]
end
from h
$$;

create or replace function public.mafivera_bootstrap() returns json language plpgsql security definer set search_path=public as $$
-- Sammelgeschwindigkeit: Grundwert 1 Ressource/Minute. Lab bzw. Waffenfabrik geben +5% je Stufe auf ihrem Ressourcelfeld.
-- Die vollständige Funktion ist absichtlich in der Haupt-Core-Datei versioniert.
declare uid uuid:=auth.uid(); p public.profiles; elapsed numeric; rec_elapsed numeric; gain_money bigint:=0; gain_material bigint:=0; gain_rep bigint:=0; gain_weapon_parts bigint:=0; gain_product bigint:=0; produced bigint:=0; labs integer:=0; recruits bigint:=0; wh integer:=0; garrison_total bigint:=0; r public.world_territories; bt text; mult numeric; batches bigint; need_xp bigint;
begin
if uid is null then raise exception 'not_authenticated'; end if;
select * into p from public.profiles where id=uid for update;if not found then raise exception 'profile_not_found';end if;
elapsed:=greatest(0,least(120,extract(epoch from(now()-p.last_economy_at))/60));rec_elapsed:=greatest(0,least(1440,extract(epoch from(now()-p.last_recruit_at))/60));
select coalesce(sum(garrison),0) into garrison_total from public.world_territories where owner_id=uid;
if elapsed>0 then
 for r in select * from public.world_territories where owner_id=uid loop
  if r.building_finish_at is not null and r.building_finish_at>now() then continue; end if;
  foreach bt in array coalesce(r.resources,array['material','money']::text[]) loop
   if bt='money' then mult:=case when r.building_type='money' then power(1.5,greatest(1,r.building_level)) else 1 end;gain_money:=gain_money+floor(2*mult*elapsed);
   elsif bt='material' then mult:=case when r.building_type='lab' then 1+0.05*greatest(1,r.building_level) when r.building_type='warehouse' then 1.25 else 1 end;gain_material:=gain_material+floor(1*mult*elapsed);
   elsif bt='reputation' then mult:=case when r.building_type='club' then power(1.5,greatest(1,r.building_level)) else 1 end;gain_rep:=gain_rep+floor(1*mult*elapsed);
   elsif bt='weapon_parts' then mult:=case when r.building_type='weapon_factory' then 1+0.05*greatest(1,r.building_level) else 1 end;gain_weapon_parts:=gain_weapon_parts+floor(1*mult*elapsed);
   end if;
  end loop;
  if r.building_type='lab' then labs:=labs+greatest(1,r.building_level);end if;
  if r.building_type='warehouse' then wh:=wh+greatest(1,r.building_level);end if;
 end loop;
 if labs>0 then batches:=least(labs::bigint*floor(elapsed),floor((p.material+gain_material)/5));gain_product:=greatest(0,batches);gain_material:=gain_material-gain_product*5;end if;
end if;
for r in select * from public.world_territories where owner_id=uid and building_type='recruitment' and (building_finish_at is null or building_finish_at<=now()) loop
 produced:=produced+floor(rec_elapsed*60/recruit_intervals_seconds(greatest(1,least(10,r.building_level))));
end loop;
recruits:=least(5000,produced);
update public.profiles set money=money+gain_money,material=least(5000+wh*1000,material+gain_material),weapon_parts=least(5000+wh*1000,weapon_parts+gain_weapon_parts),product=least(5000+wh*1000,product+gain_product),reputation=reputation+gain_rep,influence=influence+gain_rep,hitmen=least(5000,hitmen+recruits),last_economy_at=now(),last_recruit_at=now(),updated_at=now() where id=uid returning * into p;
need_xp:=50+p.level*25;while p.xp>=need_xp loop p.xp:=p.xp-need_xp;p.level:=p.level+1;need_xp:=50+p.level*25;end loop;
update public.profiles set level=p.level,xp=p.xp,updated_at=now() where id=uid returning * into p;
return json_build_object('profile',json_build_object('id',p.id,'username',p.username,'mafia_name',p.mafia_name,'money',p.money,'material',p.material,'weapon_parts',p.weapon_parts,'product',p.product,'reputation',p.reputation,'influence',p.influence,'hitmen',p.hitmen,'level',p.level,'xp',p.xp,'gps_lat',p.gps_lat,'gps_lng',p.gps_lng,'gps_accuracy',p.gps_accuracy,'territories',(select count(*) from world_territories where owner_id=uid),'warehouse_count',(select count(*) from world_territories where owner_id=uid and building_type='warehouse' and (building_finish_at is null or building_finish_at<=now())),'recruitment_centers',(select count(*) from world_territories where owner_id=uid and building_type='recruitment' and (building_finish_at is null or building_finish_at<=now())),'garrison',garrison_total,'max_hitmen',500+(select count(*) from world_territories where owner_id=uid and building_type='recruitment')*100),'territories',(select coalesce(json_agg(x),'[]'::json) from(select wt.*,coalesce(pr.username,'Spieler') username from world_territories wt left join profiles pr on pr.id=wt.owner_id where wt.owner_id=uid)x));
end;$$;

create or replace function public.mafivera_build(p_zone_key text,p_building_type text) returns json language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid();p profiles;w world_territories;cost bigint;secs integer;bd integer;existing integer;
begin
select * into p from profiles where id=uid for update;select * into w from world_territories where zone_key=p_zone_key for update;if not found or w.owner_id<>uid then raise exception 'territory_not_owned';end if;if w.building_type is not null then raise exception 'building_already_exists';end if;
if p_building_type='weapon_factory' then
 if not ('weapon_parts'=any(coalesce(w.resources,array[]::text[]))) then raise exception 'weapon_factory_requires_weapon_parts';end if;
 select count(*) into existing from world_territories where owner_id=uid and building_type='weapon_factory';if existing>0 then raise exception 'weapon_factory_limit';end if;
end if;
cost:=case p_building_type when 'warehouse' then 800 when 'money' then 250 when 'club' then 750 when 'lab' then 500 when 'market' then 900 when 'watch' then 600 when 'hideout' then 1000 when 'recruitment' then 1000 when 'weapon_factory' then 2500 else 0 end;
secs:=case p_building_type when 'warehouse' then 60 when 'money' then 45 when 'club' then 60 when 'lab' then 90 when 'market' then 90 when 'watch' then 75 when 'hideout' then 120 when 'recruitment' then 120 when 'weapon_factory' then 180 else 0 end;
bd:=case p_building_type when 'watch' then 6 when 'hideout' then 19 else 0 end;if cost=0 then raise exception 'invalid_building';end if;if p.money<cost then raise exception 'insufficient_money';end if;
update profiles set money=money-cost,updated_at=now() where id=uid;update world_territories set building_type=p_building_type,building_level=1,building_started_at=now(),building_finish_at=now()+make_interval(secs=>secs),building_defense=bd,updated_at=now() where zone_key=p_zone_key;return json_build_object('success',true);end;$$;

grant execute on function public.mafivera_bootstrap() to authenticated;
grant execute on function public.mafivera_build(text,text) to authenticated;
)) as a
), h as (
 select mod(abs(a[1]::bigint*73856093 + a[2]::bigint*19349663),100) as n from m
)
select case
 when n<5 then array['weapon_parts']::text[]
 when n<45 then array['money']::text[]
 when n<80 then array['material']::text[]
 else array['reputation']::text[]
end
from h
$$;

create or replace function public.mafivera_bootstrap() returns json language plpgsql security definer set search_path=public as $$
-- Sammelgeschwindigkeit: Grundwert 1 Ressource/Minute. Lab bzw. Waffenfabrik geben +5% je Stufe auf ihrem Ressourcelfeld.
-- Die vollständige Funktion ist absichtlich in der Haupt-Core-Datei versioniert.
declare uid uuid:=auth.uid(); p public.profiles; elapsed numeric; rec_elapsed numeric; gain_money bigint:=0; gain_material bigint:=0; gain_rep bigint:=0; gain_weapon_parts bigint:=0; gain_product bigint:=0; produced bigint:=0; labs integer:=0; recruits bigint:=0; wh integer:=0; garrison_total bigint:=0; r public.world_territories; bt text; mult numeric; batches bigint; need_xp bigint;
begin
if uid is null then raise exception 'not_authenticated'; end if;
select * into p from public.profiles where id=uid for update;if not found then raise exception 'profile_not_found';end if;
elapsed:=greatest(0,least(120,extract(epoch from(now()-p.last_economy_at))/60));rec_elapsed:=greatest(0,least(1440,extract(epoch from(now()-p.last_recruit_at))/60));
select coalesce(sum(garrison),0) into garrison_total from public.world_territories where owner_id=uid;
if elapsed>0 then
 for r in select * from public.world_territories where owner_id=uid loop
  if r.building_finish_at is not null and r.building_finish_at>now() then continue; end if;
  foreach bt in array coalesce(r.resources,array['material','money']::text[]) loop
   if bt='money' then mult:=case when r.building_type='money' then power(1.5,greatest(1,r.building_level)) else 1 end;gain_money:=gain_money+floor(2*mult*elapsed);
   elsif bt='material' then mult:=case when r.building_type='lab' then 1+0.05*greatest(1,r.building_level) when r.building_type='warehouse' then 1.25 else 1 end;gain_material:=gain_material+floor(1*mult*elapsed);
   elsif bt='reputation' then mult:=case when r.building_type='club' then power(1.5,greatest(1,r.building_level)) else 1 end;gain_rep:=gain_rep+floor(1*mult*elapsed);
   elsif bt='weapon_parts' then mult:=case when r.building_type='weapon_factory' then 1+0.05*greatest(1,r.building_level) else 1 end;gain_weapon_parts:=gain_weapon_parts+floor(1*mult*elapsed);
   end if;
  end loop;
  if r.building_type='lab' then labs:=labs+greatest(1,r.building_level);end if;
  if r.building_type='warehouse' then wh:=wh+greatest(1,r.building_level);end if;
 end loop;
 if labs>0 then batches:=least(labs::bigint*floor(elapsed),floor((p.material+gain_material)/5));gain_product:=greatest(0,batches);gain_material:=gain_material-gain_product*5;end if;
end if;
for r in select * from public.world_territories where owner_id=uid and building_type='recruitment' and (building_finish_at is null or building_finish_at<=now()) loop
 produced:=produced+floor(rec_elapsed*60/recruit_intervals_seconds(greatest(1,least(10,r.building_level))));
end loop;
recruits:=least(5000,produced);
update public.profiles set money=money+gain_money,material=least(5000+wh*1000,material+gain_material),weapon_parts=least(5000+wh*1000,weapon_parts+gain_weapon_parts),product=least(5000+wh*1000,product+gain_product),reputation=reputation+gain_rep,influence=influence+gain_rep,hitmen=least(5000,hitmen+recruits),last_economy_at=now(),last_recruit_at=now(),updated_at=now() where id=uid returning * into p;
need_xp:=50+p.level*25;while p.xp>=need_xp loop p.xp:=p.xp-need_xp;p.level:=p.level+1;need_xp:=50+p.level*25;end loop;
update public.profiles set level=p.level,xp=p.xp,updated_at=now() where id=uid returning * into p;
return json_build_object('profile',json_build_object('id',p.id,'username',p.username,'mafia_name',p.mafia_name,'money',p.money,'material',p.material,'weapon_parts',p.weapon_parts,'product',p.product,'reputation',p.reputation,'influence',p.influence,'hitmen',p.hitmen,'level',p.level,'xp',p.xp,'gps_lat',p.gps_lat,'gps_lng',p.gps_lng,'gps_accuracy',p.gps_accuracy,'territories',(select count(*) from world_territories where owner_id=uid),'warehouse_count',(select count(*) from world_territories where owner_id=uid and building_type='warehouse' and (building_finish_at is null or building_finish_at<=now())),'recruitment_centers',(select count(*) from world_territories where owner_id=uid and building_type='recruitment' and (building_finish_at is null or building_finish_at<=now())),'garrison',garrison_total,'max_hitmen',500+(select count(*) from world_territories where owner_id=uid and building_type='recruitment')*100),'territories',(select coalesce(json_agg(x),'[]'::json) from(select wt.*,coalesce(pr.username,'Spieler') username from world_territories wt left join profiles pr on pr.id=wt.owner_id where wt.owner_id=uid)x));
end;$$;

create or replace function public.mafivera_build(p_zone_key text,p_building_type text) returns json language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid();p profiles;w world_territories;cost bigint;secs integer;bd integer;existing integer;
begin
select * into p from profiles where id=uid for update;select * into w from world_territories where zone_key=p_zone_key for update;if not found or w.owner_id<>uid then raise exception 'territory_not_owned';end if;if w.building_type is not null then raise exception 'building_already_exists';end if;
if p_building_type='weapon_factory' then
 if not ('weapon_parts'=any(coalesce(w.resources,array[]::text[]))) then raise exception 'weapon_factory_requires_weapon_parts';end if;
 select count(*) into existing from world_territories where owner_id=uid and building_type='weapon_factory';if existing>0 then raise exception 'weapon_factory_limit';end if;
end if;
cost:=case p_building_type when 'warehouse' then 800 when 'money' then 250 when 'club' then 750 when 'lab' then 500 when 'market' then 900 when 'watch' then 600 when 'hideout' then 1000 when 'recruitment' then 1000 when 'weapon_factory' then 2500 else 0 end;
secs:=case p_building_type when 'warehouse' then 60 when 'money' then 45 when 'club' then 60 when 'lab' then 90 when 'market' then 90 when 'watch' then 75 when 'hideout' then 120 when 'recruitment' then 120 when 'weapon_factory' then 180 else 0 end;
bd:=case p_building_type when 'watch' then 6 when 'hideout' then 19 else 0 end;if cost=0 then raise exception 'invalid_building';end if;if p.money<cost then raise exception 'insufficient_money';end if;
update profiles set money=money-cost,updated_at=now() where id=uid;update world_territories set building_type=p_building_type,building_level=1,building_started_at=now(),building_finish_at=now()+make_interval(secs=>secs),building_defense=bd,updated_at=now() where zone_key=p_zone_key;return json_build_object('success',true);end;$$;

grant execute on function public.mafivera_bootstrap() to authenticated;
grant execute on function public.mafivera_build(text,text) to authenticated;
