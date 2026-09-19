-- MAFIVERA V1 CORE
-- Server-authoritative player economy, GPS, territories, buildings, recruitment and families.
-- Apply this migration to the connected Supabase project before starting V1.

alter table public.profiles add column if not exists level integer not null default 0;
alter table public.profiles add column if not exists xp bigint not null default 0;
alter table public.profiles add column if not exists material bigint not null default 0;
alter table public.profiles add column if not exists product bigint not null default 0;
alter table public.profiles add column if not exists influence bigint not null default 0;
alter table public.profiles add column if not exists hitmen bigint not null default 0;
alter table public.profiles add column if not exists gps_lat double precision;
alter table public.profiles add column if not exists gps_lng double precision;
alter table public.profiles add column if not exists gps_accuracy double precision;
alter table public.profiles add column if not exists last_economy_at timestamptz not null default now();
alter table public.profiles add column if not exists last_recruit_at timestamptz not null default now();
alter table public.world_territories add column if not exists building_level integer not null default 1;
alter table public.world_territories add column if not exists building_started_at timestamptz;
alter table public.world_territories add column if not exists building_finish_at timestamptz;
alter table public.world_territories add column if not exists resources text[] not null default array['material','money']::text[];
create index if not exists world_territories_owner_zone_idx on public.world_territories(owner_id,zone_key);

create or replace function public.mafivera_resources(p_zone_key text) returns text[] language sql immutable as $$
select case mod(abs(hashtext(p_zone_key)),6)
when 0 then array['money','material']::text[]
when 1 then array['material','reputation']::text[]
when 2 then array['money','reputation']::text[]
when 3 then array['material','money']::text[]
when 4 then array['reputation','money']::text[]
else array['material','reputation']::text[] end
$$;

create or replace function public.recruit_intervals_seconds(p_level integer) returns integer language sql immutable as $$
select (array[120,100,80,60,45,30,20,15,10,5])[greatest(1,least(10,p_level))]
$$;

create or replace function public.mafivera_bootstrap() returns json language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); p public.profiles; elapsed numeric; rec_elapsed numeric; gain_money bigint:=0; gain_material bigint:=0; gain_rep bigint:=0; gain_product bigint:=0; gain_weapon_parts bigint:=0; produced bigint:=0; labs integer:=0; recruits bigint:=0; wh integer:=0; garrison_total bigint:=0; r public.world_territories; bt text; mult numeric; batches bigint; need_xp bigint;
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
   elsif bt='material' then gain_material:=gain_material+floor(1*case when r.building_type='warehouse' then 1.25 else 1 end*elapsed);
   elsif bt='reputation' then mult:=case when r.building_type='club' then power(1.5,greatest(1,r.building_level)) else 1 end;gain_rep:=gain_rep+floor(1*mult*elapsed);elsif bt='weapon_parts' then mult:=case when r.building_type='weapon_factory' then 1+0.05*greatest(1,r.building_level) else 1 end;gain_weapon_parts:=gain_weapon_parts+floor(1*mult*elapsed);end if;
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
update public.profiles set money=money+gain_money,material=least(5000+wh*1000,material+gain_material),product=least(5000+wh*1000,product+gain_product),weapon_parts=weapon_parts+gain_weapon_parts,reputation=reputation+gain_rep,influence=influence+gain_rep,hitmen=least(5000,hitmen+recruits),last_economy_at=now(),last_recruit_at=now(),updated_at=now() where id=uid returning * into p;
need_xp:=50+p.level*25;while p.xp>=need_xp loop p.xp:=p.xp-need_xp;p.level:=p.level+1;need_xp:=50+p.level*25;end loop;
update public.profiles set level=p.level,xp=p.xp,updated_at=now() where id=uid returning * into p;
return json_build_object('profile',json_build_object('id',p.id,'username',p.username,'mafia_name',p.mafia_name,'money',p.money,'material',p.material,'product',p.product,'weapon_parts',p.weapon_parts,'reputation',p.reputation,'influence',p.influence,'hitmen',p.hitmen,'level',p.level,'xp',p.xp,'gps_lat',p.gps_lat,'gps_lng',p.gps_lng,'gps_accuracy',p.gps_accuracy,'territories',(select count(*) from world_territories where owner_id=uid),'warehouse_count',(select count(*) from world_territories where owner_id=uid and building_type='warehouse' and (building_finish_at is null or building_finish_at<=now())),'recruitment_centers',(select count(*) from world_territories where owner_id=uid and building_type='recruitment' and (building_finish_at is null or building_finish_at<=now())),'garrison',garrison_total,'max_hitmen',500+(select count(*) from world_territories where owner_id=uid and building_type='recruitment')*100),'territories',(select coalesce(json_agg(x),'[]'::json) from(select wt.*,coalesce(pr.username,'Spieler') username from world_territories wt left join profiles pr on pr.id=wt.owner_id where wt.owner_id=uid)x));
end;$$;

create or replace function public.mafivera_set_location(p_lat double precision,p_lng double precision,p_accuracy double precision default null) returns json language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid();begin
if uid is null or p_lat is null or p_lng is null or p_lat not between -90 and 90 or p_lng not between -180 and 180 then raise exception 'invalid_location';end if;
update public.profiles set gps_lat=p_lat,gps_lng=p_lng,gps_accuracy=p_accuracy,updated_at=now() where id=uid;
insert into public.player_presence(user_id,lat,lng,accuracy,updated_at) values(uid,p_lat,p_lng,p_accuracy,now()) on conflict(user_id) do update set lat=excluded.lat,lng=excluded.lng,accuracy=excluded.accuracy,updated_at=now();return json_build_object('success',true);end;$$;

create or replace function public.mafivera_zone_center(p_zone_key text) returns table(r integer,c integer,lat double precision,lng double precision) language plpgsql immutable as $$
declare m text[];begin m:=regexp_match(p_zone_key,'^z_(-?\\d+)_(-?\\d+)$');if m is null then raise exception 'invalid_zone';end if;r:=m[1]::integer;c:=m[2]::integer;lat:=(r+.5)*.0018;lng:=(c+.5)*.0025;return next;end;$$;

create or replace function public.mafivera_claim(p_zone_key text,p_lat double precision,p_lng double precision) returns json language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid();p public.profiles;z record;cnt integer;max_t integer;exists_owner uuid;
begin
if uid is null then raise exception 'not_authenticated';end if;select * into p from profiles where id=uid for update;if not found then raise exception 'profile_not_found';end if;if p_lat is null or p_lng is null then raise exception 'gps_required';end if;
select * into z from mafivera_zone_center(p_zone_key);if sqrt(power((p_lat-z.lat)*111000,2)+power((p_lng-z.lng)*111000*cos(radians(p_lat)),2))>180 then raise exception 'not_in_field';end if;
select owner_id into exists_owner from world_territories where zone_key=p_zone_key for update;if exists_owner is not null then raise exception 'territory_already_owned';end if;
select count(*) into cnt from world_territories where owner_id=uid;max_t:=2*p.level+2;if cnt>=max_t then raise exception 'territory_limit';end if;
if cnt>0 and not exists(select 1 from world_territories w cross join lateral mafivera_zone_center(w.zone_key) q where w.owner_id=uid and greatest(abs(q.r-z.r),abs(q.c-z.c))=1) then raise exception 'must_be_adjacent';end if;
if p.money<250 then raise exception 'insufficient_money';end if;
insert into world_territories(zone_key,owner_id,center_lat,center_lng,defense_points,garrison,resources,claimed_at,updated_at) values(p_zone_key,uid,z.lat,z.lng,25,0,mafivera_resources(p_zone_key),now(),now());
update profiles set money=money-250,reputation=reputation+5,influence=influence+1,xp=xp+25,updated_at=now() where id=uid;return json_build_object('success',true,'zone_key',p_zone_key);end;$$;

create or replace function public.mafivera_build(p_zone_key text,p_building_type text) returns json language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid();p profiles;w world_territories;cost bigint;secs integer;bd integer;
begin
select * into p from profiles where id=uid for update;select * into w from world_territories where zone_key=p_zone_key for update;if not found or w.owner_id<>uid then raise exception 'territory_not_owned';end if;if w.building_type is not null then raise exception 'building_already_exists';end if;
cost:=case p_building_type when 'warehouse' then 800 when 'money' then 250 when 'club' then 750 when 'lab' then 500 when 'market' then 900 when 'watch' then 600 when 'hideout' then 1000 when 'recruitment' then 1000 else 0 end;
secs:=case p_building_type when 'warehouse' then 60 when 'money' then 45 when 'club' then 60 when 'lab' then 90 when 'market' then 90 when 'watch' then 75 when 'hideout' then 120 when 'recruitment' then 120 else 0 end;
bd:=case p_building_type when 'watch' then 6 when 'hideout' then 19 else 0 end;if cost=0 then raise exception 'invalid_building';end if;if p.money<cost then raise exception 'insufficient_money';end if;
update profiles set money=money-cost,updated_at=now() where id=uid;update world_territories set building_type=p_building_type,building_level=1,building_started_at=now(),building_finish_at=now()+make_interval(secs=>secs),building_defense=bd,updated_at=now() where zone_key=p_zone_key;return json_build_object('success',true);end;$$;

create or replace function public.mafivera_upgrade(p_zone_key text) returns json language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid();w world_territories;p profiles;cost bigint;secs integer;new_level integer;bd integer;
begin
select * into p from profiles where id=uid for update;select * into w from world_territories where zone_key=p_zone_key for update;if not found or w.owner_id<>uid then raise exception 'territory_not_owned';end if;if w.building_type is null then raise exception 'no_building';end if;if w.building_finish_at is not null and w.building_finish_at>now() then raise exception 'building_not_ready';end if;if w.building_level>=10 then raise exception 'max_level';end if;
new_level:=w.building_level+1;cost:=case w.building_type when 'warehouse' then 600 when 'money' then 200 when 'club' then 500 when 'lab' then 400 when 'market' then 700 when 'watch' then 500 when 'hideout' then 800 when 'recruitment' then 800 else 0 end*new_level;secs:=30*new_level;bd:=case w.building_type when 'watch' then 6*new_level when 'hideout' then 19*new_level else 0 end;if p.money<cost then raise exception 'insufficient_money';end if;
update profiles set money=money-cost,updated_at=now() where id=uid;update world_territories set building_level=new_level,building_started_at=now(),building_finish_at=now()+make_interval(secs=>secs),building_defense=bd,updated_at=now() where zone_key=p_zone_key;return json_build_object('success',true,'level',new_level);end;$$;

create or replace function public.mafivera_station(p_zone_key text,p_count integer) returns json language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid();w world_territories;p profiles;cap integer;take integer;
begin
select * into p from profiles where id=uid for update;select * into w from world_territories where zone_key=p_zone_key for update;if not found or w.owner_id<>uid then raise exception 'territory_not_owned';end if;if w.building_type not in ('hideout','watch') then raise exception 'stationing_requires_security_building';end if;if w.building_finish_at is not null and w.building_finish_at>now() then raise exception 'building_not_ready';end if;
cap:=case w.building_type when 'hideout' then 10*w.building_level else 5*w.building_level end;take:=greatest(0,least(p_count,least(p.hitmen,cap-coalesce(w.garrison,0))));if take<1 then raise exception 'no_available_hitmen_or_space';end if;
update profiles set hitmen=hitmen-take,updated_at=now() where id=uid;update world_territories set garrison=coalesce(garrison,0)+take,updated_at=now() where zone_key=p_zone_key;return json_build_object('success',true,'stationed',take);end;$$;

create or replace function public.mafivera_attack(p_zone_key text,p_count integer) returns json language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid();p profiles;t world_territories;z record;losses integer;remaining integer;damage integer;total_defense integer;
begin
select * into p from profiles where id=uid for update;select * into t from world_territories where zone_key=p_zone_key for update;if not found then raise exception 'territory_not_found';end if;if t.owner_id=uid then raise exception 'already_owned';end if;if p_count<1 then raise exception 'invalid_troops';end if;
select * into z from mafivera_zone_center(p_zone_key);if not exists(select 1 from world_territories w cross join lateral mafivera_zone_center(w.zone_key) q where w.owner_id=uid and greatest(abs(q.r-z.r),abs(q.c-z.c))=1) then raise exception 'must_attack_adjacent';end if;if p.hitmen<p_count then raise exception 'not_enough_hitmen';end if;
losses:=least(p_count,coalesce(t.garrison,0));remaining:=p_count-losses;total_defense:=greatest(1,t.defense_points+coalesce(t.building_defense,0));damage:=least(remaining,total_defense);update profiles set hitmen=hitmen-p_count,updated_at=now() where id=uid;
if damage<total_defense then update world_territories set garrison=greatest(0,coalesce(garrison,0)-losses),defense_points=greatest(1,total_defense-damage),building_defense=0,updated_at=now() where zone_key=p_zone_key;return json_build_object('success',false,'losses',p_count,'damage',damage,'defense_left',greatest(1,total_defense-damage));end if;
update world_territories set owner_id=uid,defense_points=25,garrison=0,building_type=null,building_level=1,building_started_at=null,building_finish_at=null,building_defense=0,support_bonus=0,resources=mafivera_resources(p_zone_key),claimed_at=now(),updated_at=now() where zone_key=p_zone_key;update profiles set xp=xp+50,reputation=reputation+15,influence=influence+5,updated_at=now() where id=uid;return json_build_object('success',true,'captured',true,'building_destroyed',t.building_type is not null);end;$$;

create or replace function public.mafivera_sell_products(p_count integer) returns json language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid();p profiles;price numeric:=6;market integer;
begin select * into p from profiles where id=uid for update;if p_count<1 or p.product<p_count then raise exception 'invalid_product_amount';end if;select count(*) into market from world_territories where owner_id=uid and building_type='market' and (building_finish_at is null or building_finish_at<=now());price:=price*(1+0.25*market);update profiles set product=product-p_count,money=money+floor(p_count*price),updated_at=now() where id=uid;return json_build_object('success',true,'sold',p_count,'earned',floor(p_count*price));end;$$;

create table if not exists public.mtrw_families(id text primary key,owner_id uuid not null references auth.users(id) on delete cascade,name text not null,tag text not null,description text not null default 'Zusammenhalt, Ehre, Familie',level integer not null default 1,points bigint not null default 0,treasury bigint not null default 0,member_cap integer not null default 10,wins integer not null default 0,losses integer not null default 0,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table if not exists public.mtrw_family_members(family_id text not null references public.mtrw_families(id) on delete cascade,user_id uuid not null references auth.users(id) on delete cascade,role text not null default 'Mitglied',family_points bigint not null default 0,donated_total bigint not null default 0,joined_at timestamptz not null default now(),last_donation_at timestamptz,primary key(family_id,user_id),unique(user_id));
alter table public.mtrw_families enable row level security;alter table public.mtrw_family_members enable row level security;
drop policy if exists mtrw_families_read on public.mtrw_families;create policy mtrw_families_read on public.mtrw_families for select to authenticated using(true);
drop policy if exists mtrw_families_insert on public.mtrw_families;create policy mtrw_families_insert on public.mtrw_families for insert to authenticated with check(owner_id=auth.uid());
drop policy if exists mtrw_family_members_read on public.mtrw_family_members;create policy mtrw_family_members_read on public.mtrw_family_members for select to authenticated using(user_id=auth.uid() or exists(select 1 from mtrw_family_members me where me.family_id=mtrw_family_members.family_id and me.user_id=auth.uid()));
drop policy if exists mtrw_family_members_insert on public.mtrw_family_members;create policy mtrw_family_members_insert on public.mtrw_family_members for insert to authenticated with check(user_id=auth.uid());

create or replace function public.mtrw_family_create(p_id text,p_name text,p_tag text,p_description text,p_image_url text default null) returns json language plpgsql security definer set search_path=public as $$ declare uid uuid:=auth.uid();begin if uid is null then raise exception 'not_authenticated';end if;if exists(select 1 from mtrw_family_members where user_id=uid) then raise exception 'already_in_family';end if;insert into mtrw_families(id,owner_id,name,tag,description) values(p_id,uid,left(trim(p_name),32),left(upper(trim(p_tag)),6),coalesce(nullif(trim(p_description),''),'Zusammenhalt, Ehre, Familie'));insert into mtrw_family_members(family_id,user_id,role) values(p_id,uid,'Anführer');return json_build_object('success',true,'family_id',p_id);end;$$;
create or replace function public.mtrw_family_join(p_family_id text) returns json language plpgsql security definer set search_path=public as $$ declare uid uuid:=auth.uid();f mtrw_families;cnt integer;begin if uid is null then raise exception 'not_authenticated';end if;select * into f from mtrw_families where id=p_family_id for update;if not found then raise exception 'family_not_found';end if;if exists(select 1 from mtrw_family_members where user_id=uid) then raise exception 'already_in_family';end if;select count(*) into cnt from mtrw_family_members where family_id=p_family_id;if cnt>=f.member_cap then raise exception 'family_full';end if;insert into mtrw_family_members(family_id,user_id,role) values(p_family_id,uid,'Mitglied');return json_build_object('success',true);end;$$;
create or replace function public.mtrw_family_donate(p_family_id text,p_amount bigint) returns json language plpgsql security definer set search_path=public as $$ declare uid uuid:=auth.uid();begin if uid is null or p_amount<1 or p_amount>5000 then raise exception 'invalid_amount';end if;if not exists(select 1 from mtrw_family_members where family_id=p_family_id and user_id=uid) then raise exception 'not_family_member';end if;update profiles set money=money-p_amount,updated_at=now() where id=uid and money>=p_amount;if not found then raise exception 'insufficient_money';end if;update mtrw_family_members set donated_total=donated_total+p_amount,family_points=family_points+floor(p_amount/10),last_donation_at=now() where family_id=p_family_id and user_id=uid;update mtrw_families set treasury=treasury+p_amount,points=points+floor(p_amount/10),updated_at=now() where id=p_family_id;return json_build_object('success',true);end;$$;

grant execute on function public.mafivera_bootstrap() to authenticated;grant execute on function public.mafivera_set_location(double precision,double precision,double precision) to authenticated;grant execute on function public.mafivera_claim(text,double precision,double precision) to authenticated;grant execute on function public.mafivera_build(text,text) to authenticated;grant execute on function public.mafivera_upgrade(text) to authenticated;grant execute on function public.mafivera_station(text,integer) to authenticated;grant execute on function public.mafivera_attack(text,integer) to authenticated;grant execute on function public.mafivera_sell_products(integer) to authenticated;grant execute on function public.mtrw_family_create(text,text,text,text,text) to authenticated;grant execute on function public.mtrw_family_join(text) to authenticated;grant execute on function public.mtrw_family_donate(text,bigint) to authenticated;
alter table public.profiles replica identity full;alter table public.world_territories replica identity full;
DO $$ begin begin execute 'alter publication supabase_realtime add table public.profiles';exception when duplicate_object then null;when undefined_object then null;end;begin execute 'alter publication supabase_realtime add table public.world_territories';exception when duplicate_object then null;when undefined_object then null;end;end $$;
