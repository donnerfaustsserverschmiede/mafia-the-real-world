alter table public.mafivera_buildings drop constraint if exists mafivera_buildings_footprint_m_check;
alter table public.mafivera_buildings add constraint mafivera_buildings_footprint_m_check check (footprint_m in (30,226));
create or replace function public.mafivera_place_building(p_building_type text,p_lat double precision,p_lng double precision,p_crop text default null,p_resource_concentrations jsonb default '{}'::jsonb) returns public.mafivera_buildings language plpgsql security definer set search_path=public,auth as $$
declare u uuid:=auth.uid(); f integer; b public.mafivera_buildings; glat double precision;glng double precision;d double precision;k text;c integer:=0;rate numeric:=0;
begin
if u is null then raise exception 'Bitte anmelden.';end if;
if p_building_type not in('grain_mill','scrap_recycling','chemical_works','chemical_store','metal_recycling','field','headquarters','recruitment','warehouse','money_laundering','watchpost') then raise exception 'Ungültiger Gebäudetyp.';end if;
f:=case when p_building_type='field' then 226 else 30 end;
if p_building_type='field' and p_crop not in('cannabis','coca','tobacco') then raise exception 'Bitte Feldfrucht auswählen.';end if;
select gps_lat,gps_lng into glat,glng from public.profiles where id=u for update;
if glat is null or glng is null then raise exception 'GPS-Standort fehlt.';end if;
d:=12742000*asin(sqrt(power(sin(radians(p_lat-glat)/2),2)+cos(radians(glat))*cos(radians(p_lat))*power(sin(radians(p_lng-glng)/2),2)));
if d>500 then raise exception 'Außerhalb deines Baubereichs.';end if;
if p_building_type='headquarters' and exists(select 1 from public.mafivera_buildings where owner_id=u and building_type='headquarters') then raise exception 'Nur ein Hauptquartier erlaubt.';end if;
if p_building_type not in('headquarters','recruitment','warehouse','money_laundering','watchpost') and exists(select 1 from public.mafivera_buildings x where x.building_type not in('headquarters','recruitment','warehouse','money_laundering','watchpost') and abs(p_lat-x.lat)*111320<(f+x.footprint_m)/2 and abs(p_lng-x.lng)*111320*cos(radians(p_lat))<(f+x.footprint_m)/2) then raise exception 'Du bist zu nah an einem bestehenden Gebäude.';end if;
k:=case p_building_type when 'grain_mill' then 'flour' when 'scrap_recycling' then 'weapon_parts' when 'chemical_works' then 'meth' when 'chemical_store' then 'chemicals' when 'metal_recycling' then 'metals' else p_crop end;
if k is not null then c:=greatest(0,least(100,coalesce((p_resource_concentrations->>k)::integer,0)));rate:=0.02+c*0.0018;end if;
insert into public.mafivera_buildings(owner_id,building_type,lat,lng,crop,resource_concentrations,footprint_m,production_per_second) values(u,p_building_type,p_lat,p_lng,p_crop,coalesce(p_resource_concentrations,'{}'::jsonb),f,rate) returning * into b;return b;end $$;
grant execute on function public.mafivera_place_building(text,double precision,double precision,text,jsonb) to authenticated;