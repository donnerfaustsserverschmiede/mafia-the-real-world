-- MAFIVERA: weapon dealer appears once per hour in a stable random 10-minute window.
create or replace function public.mtrw_weapon_dealer_state()
returns jsonb language plpgsql security definer set search_path=public as $function$
declare
 uid uuid:=auth.uid(); p profiles%rowtype; slot bigint; minute_of_hour integer; start_minute integer; s record;
 wtype text; price bigint; qty integer; started timestamptz; until_at timestamptz; bearing double precision; dist double precision; off_lat double precision; off_lng double precision; factory_level integer:=0; trade integer:=0; actual numeric; next_epoch bigint;
begin
 if uid is null then raise exception 'not_authenticated'; end if;
 select * into p from profiles where id=uid;
 if p.gps_lat is null or p.gps_lng is null then return jsonb_build_object('active',false,'reason','gps_missing'); end if;
 slot:=floor(extract(epoch from now())/3600);
 minute_of_hour:=floor(mod(extract(epoch from now()),3600)/60);
 start_minute:=mod(abs(hashtextextended(uid::text||slot::text,77)),51);
 if minute_of_hour<start_minute then
   next_epoch:=slot*3600+start_minute*60;
   return jsonb_build_object('active',false,'next_at',to_timestamp(next_epoch),'cooldown_seconds',greatest(0,next_epoch-floor(extract(epoch from now()))));
 end if;
 if minute_of_hour>=start_minute+10 then
   return jsonb_build_object('active',false,'next_at',to_timestamp((slot+1)*3600+mod(abs(hashtextextended(uid::text||(slot+1)::text,77)),51)*60));
 end if;
 select coalesce(max(building_level),0) into factory_level from world_territories where owner_id=uid and building_type='weapon_factory' and (building_finish_at is null or building_finish_at<=now());
 if factory_level<1 then return jsonb_build_object('active',false,'reason','weapon_factory_required'); end if;
 select trade into trade from mtrw_family_effects(uid);
 select * into s from mtrw_weapon_dealer_spawns where user_id=uid and slot=slot and active_from<=now() and active_until>now() and remaining_quantity>0 limit 1;
 if s.id is not null then
   select 6371000*2*asin(sqrt(power(sin(radians((p.gps_lat-s.lat)/2)),2)+cos(radians(s.lat))*cos(radians(p.gps_lat))*power(sin(radians((p.gps_lng-s.lng)/2)),2))) into actual;
   if actual>500 then return jsonb_build_object('active',false,'reason','weapon_dealer_outside_radar'); end if;
   return jsonb_build_object('active',true,'id',s.id,'lat',s.lat,'lng',s.lng,'weapon_type',s.weapon_type,'price',s.price_per_unit,'remaining',least(50,s.remaining_quantity),'active_until',s.active_until);
 end if;
 wtype:=case mod(abs(hashtextextended(uid::text||slot::text,91)),4) when 0 then 'weapon_melee' when 1 then 'weapon_handgun' when 2 then 'weapon_smg' else 'weapon_longarm' end;
 price:=case wtype when 'weapon_melee' then 300 when 'weapon_handgun' then 700 when 'weapon_smg' then 1400 else 2200 end;
 price:=floor(price*(1+greatest(0,least(20,trade))*0.05));
 qty:=5+floor(random()*16)::integer;
 bearing:=mod(abs(hashtextextended(uid::text||slot::text,131)),6284)::double precision/1000.0;
 dist:=mod(abs(hashtextextended(uid::text||slot::text,143)),451);
 off_lat:=(dist*cos(bearing))/111320.0; off_lng:=(dist*sin(bearing))/(111320.0*greatest(0.2,cos(radians(p.gps_lat))));
 started:=to_timestamp(slot*3600+start_minute*60); until_at:=started+interval '10 minutes';
 insert into mtrw_weapon_dealer_spawns(user_id,slot,lat,lng,weapon_type,price_per_unit,max_quantity,remaining_quantity,active_from,active_until)
 values(uid,slot,p.gps_lat+off_lat,p.gps_lng+off_lng,wtype,price,qty,qty,started,until_at) returning * into s;
 return jsonb_build_object('active',true,'id',s.id,'lat',s.lat,'lng',s.lng,'weapon_type',s.weapon_type,'price',price,'remaining',qty,'active_until',until_at);
end;
$function$;
grant execute on function public.mtrw_weapon_dealer_state() to authenticated;