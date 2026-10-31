create or replace function public.mafivera_delete_building(p_building_id uuid) returns void language plpgsql security definer set search_path=public,auth as $$
begin
 if auth.uid() is null then raise exception 'Bitte anmelden.'; end if;
 delete from public.mafivera_buildings where id=p_building_id and owner_id=auth.uid();
 if not found then raise exception 'Gebäude nicht gefunden oder keine Berechtigung.'; end if;
end $$;
grant execute on function public.mafivera_delete_building(uuid) to authenticated;
create or replace function public.mafivera_move_building(p_building_id uuid,p_lat double precision,p_lng double precision) returns public.mafivera_buildings language plpgsql security definer set search_path=public,auth as $$
declare u uuid:=auth.uid(); b public.mafivera_buildings; glat double precision;glng double precision;d double precision;
begin
 if u is null then raise exception 'Bitte anmelden.'; end if;
 select * into b from public.mafivera_buildings where id=p_building_id and owner_id=u for update;
 if not found then raise exception 'Gebäude nicht gefunden oder keine Berechtigung.'; end if;
 select gps_lat,gps_lng into glat,glng from public.profiles where id=u;
 if glat is null or glng is null then raise exception 'GPS-Standort fehlt.'; end if;
 d:=12742000*asin(sqrt(power(sin(radians(p_lat-glat)/2),2)+cos(radians(glat))*cos(radians(p_lat))*power(sin(radians(p_lng-glng)/2),2)));
 if d>500 then raise exception 'Außerhalb deines Baubereichs.'; end if;
 if b.building_type not in('headquarters','recruitment','warehouse','money_laundering','watchpost') and exists(select 1 from public.mafivera_buildings x where x.id<>b.id and x.building_type not in('headquarters','recruitment','warehouse','money_laundering','watchpost') and abs(p_lat-x.lat)*111320<(b.footprint_m+x.footprint_m)/2 and abs(p_lng-x.lng)*111320*cos(radians(p_lat))<(b.footprint_m+x.footprint_m)/2) then raise exception 'Du bist zu nah an einem bestehenden Gebäude.'; end if;
 update public.mafivera_buildings set lat=p_lat,lng=p_lng where id=b.id returning * into b; return b;
end $$;
grant execute on function public.mafivera_move_building(uuid,double precision,double precision) to authenticated;