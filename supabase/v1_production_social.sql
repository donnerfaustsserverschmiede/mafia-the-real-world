-- MAFIVERA V1 production + social backend
-- Idempotent: safe to apply after world_production.sql.

create table if not exists public.mtrw_production_jobs (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  quantity integer not null check(quantity>0), material_cost integer not null check(material_cost>0),
  started_at timestamptz not null default now(), finish_at timestamptz not null,
  status text not null default 'running' check(status in ('running','completed','cancelled')),
  collected_at timestamptz, created_at timestamptz not null default now()
);
create index if not exists mtrw_production_jobs_user_status_idx on public.mtrw_production_jobs(user_id,status);
alter table public.mtrw_production_jobs enable row level security;
drop policy if exists mtrw_production_jobs_read_own on public.mtrw_production_jobs;
create policy mtrw_production_jobs_read_own on public.mtrw_production_jobs for select to authenticated using(user_id=auth.uid());

create table if not exists public.mtrw_social_invites (
  id uuid primary key default gen_random_uuid(), code text not null unique, inviter_id uuid not null references public.profiles(id) on delete cascade,
  invited_user_id uuid references public.profiles(id) on delete set null, status text not null default 'pending' check(status in ('pending','accepted','expired')),
  created_at timestamptz not null default now(), accepted_at timestamptz
);
create index if not exists mtrw_social_invites_inviter_idx on public.mtrw_social_invites(inviter_id,status);
create index if not exists mtrw_social_invites_invited_idx on public.mtrw_social_invites(invited_user_id,status);
alter table public.mtrw_social_invites enable row level security;
drop policy if exists mtrw_social_invites_read_own on public.mtrw_social_invites;
create policy mtrw_social_invites_read_own on public.mtrw_social_invites for select to authenticated using(inviter_id=auth.uid() or invited_user_id=auth.uid());

create table if not exists public.mtrw_friendships (
  user_id uuid not null references public.profiles(id) on delete cascade, friend_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(), primary key(user_id,friend_id), check(user_id<>friend_id)
);
alter table public.mtrw_friendships enable row level security;
drop policy if exists mtrw_friendships_read_own on public.mtrw_friendships;
create policy mtrw_friendships_read_own on public.mtrw_friendships for select to authenticated using(user_id=auth.uid() or friend_id=auth.uid());

create or replace function public.mafivera_start_production(p_quantity integer) returns json language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); p profiles; active mtrw_production_jobs; cost integer; seconds integer; j mtrw_production_jobs; labs integer; cap integer;
begin
 if uid is null then raise exception 'not_authenticated'; end if;
 if p_quantity is null or p_quantity<1 then raise exception 'invalid_production_amount'; end if;
 select * into p from profiles where id=uid for update; if not found then raise exception 'profile_not_found'; end if;
 select count(*) into labs from world_territories where owner_id=uid and building_type='lab' and (building_finish_at is null or building_finish_at<=now());
 if labs<1 then raise exception 'production_requires_lab'; end if;
 select * into active from mtrw_production_jobs where user_id=uid and status='running' order by created_at desc limit 1 for update;
 if active.id is not null then if active.finish_at<=now() then update mtrw_production_jobs set status='completed' where id=active.id; else raise exception 'production_already_running'; end if; end if;
 if p_quantity>floor(p.material/5) then raise exception 'insufficient_material'; end if;
 select 5000+count(*)*1000 into cap from world_territories where owner_id=uid and building_type='warehouse' and (building_finish_at is null or building_finish_at<=now());
 if p.product+p_quantity>cap then raise exception 'product_storage_full'; end if;
 cost:=p_quantity*5; seconds:=p_quantity*30;
 update profiles set material=material-cost,updated_at=now() where id=uid;
 insert into mtrw_production_jobs(user_id,quantity,material_cost,started_at,finish_at,status) values(uid,p_quantity,cost,now(),now()+make_interval(secs=>seconds),'running') returning * into j;
 return json_build_object('success',true,'job_id',j.id,'quantity',j.quantity,'material_cost',j.material_cost,'started_at',j.started_at,'finish_at',j.finish_at);
end;$$;
grant execute on function public.mafivera_start_production(integer) to authenticated;

create or replace function public.mafivera_collect_production() returns json language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); j mtrw_production_jobs; p profiles; cap integer;
begin
 if uid is null then raise exception 'not_authenticated'; end if;
 select * into j from mtrw_production_jobs where user_id=uid and status='running' order by created_at desc limit 1 for update;
 if j.id is null then return json_build_object('running',false,'completed',0); end if;
 if j.finish_at>now() then return json_build_object('running',true,'completed',0,'quantity',j.quantity,'started_at',j.started_at,'finish_at',j.finish_at); end if;
 select * into p from profiles where id=uid for update;
 select 5000+count(*)*1000 into cap from world_territories where owner_id=uid and building_type='warehouse' and (building_finish_at is null or building_finish_at<=now());
 if p.product+j.quantity>cap then return json_build_object('running',false,'completed',0,'blocked',true,'reason','product_storage_full','quantity',j.quantity,'finish_at',j.finish_at); end if;
 update profiles set product=product+j.quantity,updated_at=now() where id=uid;
 update mtrw_production_jobs set status='completed',collected_at=now() where id=j.id;
 return json_build_object('running',false,'completed',j.quantity,'job_id',j.id);
end;$$;
grant execute on function public.mafivera_collect_production() to authenticated;

create or replace function public.mtrw_create_invite() returns json language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); code text;
begin
 if uid is null then raise exception 'not_authenticated'; end if;
 code:=lower(substr(md5(random()::text||clock_timestamp()::text||uid::text),1,18));
 insert into mtrw_social_invites(code,inviter_id) values(code,uid);
 return json_build_object('success',true,'code',code);
end;$$;
grant execute on function public.mtrw_create_invite() to authenticated;

create or replace function public.mtrw_accept_invite(p_code text) returns json language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); i mtrw_social_invites; inv profiles; me profiles;
begin
 if uid is null then raise exception 'not_authenticated'; end if;
 select * into i from mtrw_social_invites where code=lower(trim(p_code)) for update;
 if not found then raise exception 'invite_not_found'; end if;
 if i.inviter_id=uid then raise exception 'cannot_accept_own_invite'; end if;
 if i.status='accepted' and i.invited_user_id<>uid then raise exception 'invite_already_used'; end if;
 if i.status='expired' then raise exception 'invite_expired'; end if;
 select * into inv from profiles where id=i.inviter_id; select * into me from profiles where id=uid;
 if i.status='pending' then update mtrw_social_invites set invited_user_id=uid,status='accepted',accepted_at=now() where id=i.id; insert into mtrw_friendships(user_id,friend_id) values(i.inviter_id,uid) on conflict do nothing; insert into mtrw_friendships(user_id,friend_id) values(uid,i.inviter_id) on conflict do nothing; end if;
 return json_build_object('success',true,'friend_id',i.inviter_id,'friend_username',inv.username,'friend_mafia_name',inv.mafia_name,'username',me.username);
end;$$;
grant execute on function public.mtrw_accept_invite(text) to authenticated;

create or replace function public.mtrw_social_snapshot() returns json language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid();
begin
 if uid is null then raise exception 'not_authenticated'; end if;
 return json_build_object(
 'friends',(select coalesce(json_agg(x order by x.username),'[]'::json) from (select p.id,p.username,p.mafia_name,p.level,p.reputation from mtrw_friendships f join profiles p on p.id=f.friend_id where f.user_id=uid)x),
 'sent',(select coalesce(json_agg(x order by x.created_at desc),'[]'::json) from (select i.id,i.code,i.status,i.created_at,i.accepted_at,p.username,p.mafia_name from mtrw_social_invites i left join profiles p on p.id=i.invited_user_id where i.inviter_id=uid)x),
 'received',(select coalesce(json_agg(x order by x.created_at desc),'[]'::json) from (select i.id,i.code,i.status,i.created_at,p.username,p.mafia_name from mtrw_social_invites i join profiles p on p.id=i.inviter_id where i.invited_user_id=uid)x));
end;$$;
grant execute on function public.mtrw_social_snapshot() to authenticated;

-- MAFIVERA weapon production + weapon factory collection
alter table public.mtrw_production_jobs add column if not exists drug_type text not null default 'cocaine';
alter table public.mtrw_production_jobs add column if not exists recipe_key text;
alter table public.mtrw_production_jobs add column if not exists material_refund integer not null default 0;
alter table public.mtrw_production_jobs add column if not exists resource_cost_type text not null default 'material';
create table if not exists public.mtrw_weapon_inventory (
 user_id uuid primary key references public.profiles(id) on delete cascade,
 melee integer not null default 0,
 handguns integer not null default 0,
 smgs integer not null default 0,
 longarms integer not null default 0,
 updated_at timestamptz not null default now()
);
alter table public.mtrw_weapon_inventory enable row level security;
drop policy if exists mtrw_weapon_inventory_read_own on public.mtrw_weapon_inventory;
create policy mtrw_weapon_inventory_read_own on public.mtrw_weapon_inventory for select to authenticated using(user_id=auth.uid());
grant select on public.mtrw_weapon_inventory to authenticated;
create or replace function public.mtrw_weapon_recipe(p_weapon_type text) returns jsonb language sql immutable as $$
select case lower(p_weapon_type)
 when 'weapon_melee' then jsonb_build_object('name','Hieb- und Stichwaffen','parts',10,'seconds',30,'market_value',300,'unlock_level',0,'inventory_key','melee')
 when 'weapon_handgun' then jsonb_build_object('name','Handfeuerwaffen','parts',25,'seconds',60,'market_value',700,'unlock_level',0,'inventory_key','handguns')
 when 'weapon_smg' then jsonb_build_object('name','Kleine Langwaffen / Maschinenpistolen','parts',50,'seconds',120,'market_value',1400,'unlock_level',0,'inventory_key','smgs')
 when 'weapon_longarm' then jsonb_build_object('name','Langwaffen','parts',100,'seconds',240,'market_value',2200,'unlock_level',0,'inventory_key','longarms')
 else null end$$;
create or replace function public.mtrw_start_production(p_drug_type text,p_quantity integer) returns jsonb language plpgsql security definer set search_path=public as $$
declare u uuid:=auth.uid(); r jsonb; cost integer; seconds integer; slots integer; running integer; j uuid; factory_level integer:=0; lab_level integer:=0; is_weapon boolean:=false; resource text:='material';
begin
if u is null then raise exception 'Nicht angemeldet.'; end if; if p_quantity<1 then raise exception 'Ungültige Menge.'; end if;
is_weapon:=lower(p_drug_type) like 'weapon_%';
if is_weapon then
 r:=public.mtrw_weapon_recipe(lower(p_drug_type)); if r is null then raise exception 'Unbekannte Waffenproduktion.'; end if;
 select coalesce(max(building_level),0) into factory_level from world_territories where owner_id=u and building_type='weapon_factory' and (building_finish_at is null or building_finish_at<=now());
 if factory_level<1 then raise exception 'Eine fertige Waffenfabrik wird benötigt.'; end if;
 cost:=(r->>'parts')::integer*p_quantity; resource:='weapon_parts'; seconds:=(r->>'seconds')::integer*p_quantity;
 if (select weapon_parts from profiles where id=u)<cost then raise exception 'Nicht genug Waffenteile. Benötigt: %',cost; end if;
 update profiles set weapon_parts=weapon_parts-cost,updated_at=now() where id=u;
else
 r:=public.mtrw_recipe(p_drug_type); if r is null then raise exception 'Unbekannte Droge.'; end if;
 cost:=(r->>'material')::integer*p_quantity; seconds:=(r->>'seconds')::integer*p_quantity;
 select coalesce(max(building_level),0) into lab_level from world_territories where owner_id=u and building_type='lab' and (building_finish_at is null or building_finish_at<=now());
 if lab_level<1 then raise exception 'Ein fertiges Chemielabor wird benötigt.'; end if;
 if (select material from profiles where id=u)<cost then raise exception 'Nicht genug Material. Benötigt: %',cost; end if;
 if (select product from profiles where id=u)+p_quantity>5000 then raise exception 'product_storage_full'; end if;
 update profiles set material=material-cost,updated_at=now() where id=u;
end if;
slots:=public.mtrw_production_slots((select coalesce(level,0) from profiles where id=u)); select count(*) into running from mtrw_production_jobs where user_id=u and status='running'; if running>=slots then raise exception 'Alle Produktionsslots sind belegt (% Slots).',slots; end if;
insert into mtrw_production_jobs(user_id,quantity,material_cost,started_at,finish_at,status,drug_type,recipe_key,resource_cost_type) values(u,p_quantity,cost,now(),now()+make_interval(secs=>seconds),'running',lower(p_drug_type),lower(p_drug_type),resource) returning id into j;
return jsonb_build_object('id',j,'cost',cost,'resource',resource,'finish_at',now()+make_interval(secs=>seconds),'slots',slots,'duration_seconds',seconds);
end;$$;
grant execute on function public.mtrw_start_production(text,integer) to authenticated;
create or replace function public.mtrw_cancel_production(p_job_id uuid) returns jsonb language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); j mtrw_production_jobs; refund integer;
begin if uid is null then raise exception 'not_authenticated'; end if; select * into j from mtrw_production_jobs where id=p_job_id and user_id=uid for update; if not found then raise exception 'production_not_found'; end if; if j.status<>'running' then raise exception 'production_not_running'; end if; refund:=coalesce(j.material_cost,j.material_refund,0); if coalesce(j.resource_cost_type,'material')='weapon_parts' then update profiles set weapon_parts=weapon_parts+refund,updated_at=now() where id=uid; else update profiles set material=material+refund,updated_at=now() where id=uid; end if; update mtrw_production_jobs set status='cancelled',material_refund=refund,collected_at=now() where id=j.id; return jsonb_build_object('success',true,'id',j.id,'refund',refund,'resource',coalesce(j.resource_cost_type,'material')); end;$$;
grant execute on function public.mtrw_cancel_production(uuid) to authenticated;
create or replace function public.mafivera_collect_production() returns json language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); p profiles; j record; cap integer; completed integer:=0; produced bigint:=0; weapons_produced bigint:=0; xp_gain bigint:=0; running_json json; blocked boolean:=false;
begin if uid is null then raise exception 'not_authenticated'; end if; select * into p from profiles where id=uid for update; select 5000+count(*)*1000 into cap from world_territories where owner_id=uid and building_type='warehouse' and (building_finish_at is null or building_finish_at<=now());
for j in select * from mtrw_production_jobs where user_id=uid and status='running' and finish_at<=now() order by created_at for update loop
 if j.drug_type like 'weapon_%' then insert into mtrw_weapon_inventory(user_id) values(uid) on conflict(user_id) do nothing; execute format('update mtrw_weapon_inventory set %I=%I+$1,updated_at=now() where user_id=$2',(public.mtrw_weapon_recipe(j.drug_type)->>'inventory_key'),(public.mtrw_weapon_recipe(j.drug_type)->>'inventory_key')) using j.quantity,uid; update mtrw_production_jobs set status='completed',collected_at=now() where id=j.id; weapons_produced:=weapons_produced+j.quantity; completed:=completed+1; xp_gain:=xp_gain+(j.quantity*10);
 elsif p.product+j.quantity<=cap then update profiles set product=product+j.quantity where id=uid; update mtrw_production_jobs set status='completed',collected_at=now() where id=j.id; p.product:=p.product+j.quantity; produced:=produced+j.quantity; completed:=completed+1; xp_gain:=xp_gain+(j.quantity*5); else blocked:=true; end if; end loop;
if xp_gain>0 then p.xp:=p.xp+xp_gain; end if; update profiles set product=p.product,xp=p.xp,updated_at=now() where id=uid; perform public.mtrw_level_up(uid); select coalesce(json_agg(x order by x.created_at),'[]'::json) into running_json from (select id,quantity,drug_type,started_at,finish_at,created_at from mtrw_production_jobs where user_id=uid and status='running') x; select level,xp into p.level,p.xp from profiles where id=uid; return json_build_object('running',running_json,'running_count',jsonb_array_length(running_json::jsonb),'completed',completed,'produced',produced,'weapons_produced',weapons_produced,'xp_gained',xp_gain,'blocked',blocked,'slots',public.mtrw_production_slots(p.level),'level',p.level,'xp',p.xp); end;$$;
grant execute on function public.mafivera_collect_production() to authenticated;
