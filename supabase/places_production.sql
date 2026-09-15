-- MTRW PRODUCTION: idempotent real-world place ownership schema.

create table if not exists public.game_places (id text primary key,osm_type text not null,osm_id bigint not null,name text not null,kind text not null,geometry jsonb,center_lat double precision not null,center_lng double precision not null,owner_id uuid references public.profiles(id) on delete set null,claimed_at timestamptz,claim_lat double precision,claim_lng double precision,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create index if not exists game_places_owner_idx on public.game_places(owner_id);
create index if not exists game_places_osm_idx on public.game_places(osm_type,osm_id);
alter table public.game_places enable row level security;
drop policy if exists game_places_public_read on public.game_places;
create policy game_places_public_read on public.game_places for select using (true);
alter table public.game_places add column if not exists tier text not null default 'property';
alter table public.game_places add column if not exists influence_value integer not null default 1;
alter table public.game_places add column if not exists claim_reward_money bigint not null default 100;
alter table public.game_places add column if not exists claim_reward_reputation integer not null default 5;

create or replace function public.game_place_tier(p_kind text) returns text language sql immutable as $$ select case when lower(coalesce(p_kind,'')) in ('city','town') then 'city' when lower(coalesce(p_kind,'')) in ('suburb','quarter','neighbourhood') then 'district' when lower(coalesce(p_kind,'')) in ('village','hamlet') then 'settlement' when lower(coalesce(p_kind,'')) in ('residential','industrial') then 'area' else 'property' end; $$;
create or replace function public.game_place_influence(p_tier text) returns integer language sql immutable as $$ select case lower(coalesce(p_tier,'')) when 'city' then 1000 when 'district' then 250 when 'settlement' then 50 when 'area' then 10 else 1 end; $$;
create or replace function public.game_place_money(p_tier text) returns bigint language sql immutable as $$ select case lower(coalesce(p_tier,'')) when 'city' then 5000 when 'district' then 1500 when 'settlement' then 500 when 'area' then 200 else 100 end; $$;
create or replace function public.game_place_rep(p_tier text) returns integer language sql immutable as $$ select case lower(coalesce(p_tier,'')) when 'city' then 100 when 'district' then 40 when 'settlement' then 20 when 'area' then 10 else 5 end; $$;
update public.game_places set tier=public.game_place_tier(kind),influence_value=public.game_place_influence(public.game_place_tier(kind)),claim_reward_money=public.game_place_money(public.game_place_tier(kind)),claim_reward_reputation=public.game_place_rep(public.game_place_tier(kind)),updated_at=now();

create or replace function public.game_place_point_in(p_lat double precision,p_lng double precision,p_geometry jsonb) returns boolean language plpgsql immutable as $$
declare a jsonb; x double precision; y double precision; first_lat double precision; first_lng double precision; prev_lat double precision; prev_lng double precision; inside boolean:=false; first_point boolean:=true; n integer:=0;
begin
 if p_geometry is null or jsonb_typeof(p_geometry)<>'array' then return false; end if;
 for a in select value from jsonb_array_elements(p_geometry) loop
  if a ? 'lat' and a ? 'lon' then
   n:=n+1; x:=(a->>'lon')::double precision; y:=(a->>'lat')::double precision;
   if first_point then first_lat:=y;first_lng:=x;prev_lat:=y;prev_lng:=x;first_point:=false;continue;end if;
   if ((prev_lat>p_lat)<>(y>p_lat)) and p_lng < (x-prev_lng)*(p_lat-prev_lat)/nullif(y-prev_lat,0)+prev_lng then inside:=not inside; end if;
   prev_lat:=y;prev_lng:=x;
  end if;
 end loop;
 if n>=3 and ((prev_lat>p_lat)<>(first_lat>p_lat)) and p_lng < (first_lng-prev_lng)*(p_lat-prev_lat)/nullif(first_lat-prev_lat,0)+prev_lng then inside:=not inside; end if;
 return n>=3 and inside;
end;$$;

drop function if exists public.claim_place(text,text,bigint,text,text,double precision,double precision,jsonb);
drop function if exists public.claim_place(text,text,bigint,text,text,double precision,double precision,jsonb,double precision,double precision);
create or replace function public.claim_place(p_place_id text,p_osm_type text,p_osm_id bigint,p_name text,p_kind text,p_lat double precision,p_lng double precision,p_geometry jsonb,p_center_lat double precision,p_center_lng double precision) returns json language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid();new_money bigint;new_rep integer;v_tier text;v_influence integer;v_reward_money bigint;v_reward_rep integer;valid_here boolean:=false;c_lat double precision;c_lng double precision;
begin
 if uid is null then raise exception 'not_authenticated'; end if;
 if p_lat is null or p_lng is null or p_lat not between -90 and 90 or p_lng not between -180 and 180 then raise exception 'invalid_location'; end if;
 if p_center_lat is null or p_center_lng is null or p_center_lat not between -90 and 90 or p_center_lng not between -180 and 180 then raise exception 'invalid_center'; end if;
 if p_place_id is null or p_osm_type not in ('way','relation','node') or p_osm_id is null then raise exception 'invalid_place'; end if;
 v_tier:=public.game_place_tier(p_kind);v_influence:=public.game_place_influence(v_tier);v_reward_money:=public.game_place_money(v_tier);v_reward_rep:=public.game_place_rep(v_tier);
 if exists(select 1 from public.game_places where id=p_place_id and owner_id is not null) then raise exception 'place_already_owned'; end if;
 if p_geometry is not null and jsonb_typeof(p_geometry)='array' then
   valid_here:=public.game_place_point_in(p_lat,p_lng,p_geometry);
   select avg((x->>'lat')::double precision),avg((x->>'lon')::double precision) into c_lat,c_lng from jsonb_array_elements(p_geometry) x where x ? 'lat' and x ? 'lon';
 end if;
 if c_lat is null then c_lat:=p_center_lat;c_lng:=p_center_lng; end if;
 if not valid_here and sqrt(power((c_lat-p_lat)*111000,2)+power((c_lng-p_lng)*111000*cos(radians(p_lat)),2))<=150 then valid_here:=true;end if;
 if not valid_here then raise exception 'not_inside_place';end if;
 insert into public.game_places(id,osm_type,osm_id,name,kind,geometry,center_lat,center_lng,owner_id,claimed_at,claim_lat,claim_lng,tier,influence_value,claim_reward_money,claim_reward_reputation,updated_at) values(p_place_id,p_osm_type,p_osm_id,coalesce(nullif(p_name,''),'Unbenanntes Gebiet'),p_kind,p_geometry,c_lat,c_lng,uid,now(),p_lat,p_lng,v_tier,v_influence,v_reward_money,v_reward_rep,now()) on conflict(id) do update set owner_id=excluded.owner_id,claimed_at=excluded.claimed_at,claim_lat=excluded.claim_lat,claim_lng=excluded.claim_lng,tier=excluded.tier,influence_value=excluded.influence_value,claim_reward_money=excluded.claim_reward_money,claim_reward_reputation=excluded.claim_reward_reputation,updated_at=now() where public.game_places.owner_id is null;
 if not found then raise exception 'place_already_owned';end if;
 update public.profiles set money=money+v_reward_money,reputation=reputation+v_reward_rep,updated_at=now() where id=uid returning money,reputation into new_money,new_rep;
 if new_money is null then raise exception 'profile_not_found';end if;
 return json_build_object('success',true,'money',new_money,'reputation',new_rep,'tier',v_tier,'influence',v_influence,'reward_money',v_reward_money,'reward_reputation',v_reward_rep);
end;$$;
grant execute on function public.claim_place(text,text,bigint,text,text,double precision,double precision,jsonb,double precision,double precision) to authenticated;
grant execute on function public.game_place_point_in(double precision,double precision,jsonb) to authenticated;
