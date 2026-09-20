-- MAFIVERA: keep legacy drug jobs (NULL drug_type) in the drug collector.
create or replace function public.mtrw_collect_drug_production()
returns json
language plpgsql
security definer
set search_path=public
as $function$
declare
  uid uuid:=auth.uid();
  p profiles;
  j record;
  cap integer;
  completed integer:=0;
  produced bigint:=0;
  xp_gain bigint:=0;
  running_json json;
  blocked boolean:=false;
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  select * into p from profiles where id=uid for update;
  select 5000+count(*)*1000 into cap
    from world_territories
    where owner_id=uid and building_type='warehouse'
      and (building_finish_at is null or building_finish_at<=now());

  for j in
    select * from mtrw_production_jobs
    where user_id=uid and status='running' and finish_at<=now()
      and (drug_type is null or drug_type not like 'weapon_%')
    order by created_at for update
  loop
    if p.product+j.quantity<=cap then
      update profiles set product=product+j.quantity where id=uid;
      update mtrw_production_jobs set status='completed',collected_at=now() where id=j.id;
      p.product:=p.product+j.quantity;
      produced:=produced+j.quantity;
      completed:=completed+1;
      xp_gain:=xp_gain+(j.quantity*5);
    else
      blocked:=true;
    end if;
  end loop;

  if xp_gain>0 then p.xp:=p.xp+xp_gain; end if;
  update profiles set product=p.product,xp=p.xp,updated_at=now() where id=uid;
  perform public.mtrw_level_up(uid);

  select coalesce(json_agg(x order by x.created_at),'[]'::json) into running_json
  from (
    select id,quantity,drug_type,started_at,finish_at,created_at
    from mtrw_production_jobs
    where user_id=uid and status='running'
      and (drug_type is null or drug_type not like 'weapon_%')
  ) x;

  select level,xp into p.level,p.xp from profiles where id=uid;
  return json_build_object(
    'running',running_json,
    'running_count',jsonb_array_length(running_json::jsonb),
    'completed',completed,
    'produced',produced,
    'xp_gained',xp_gain,
    'blocked',blocked,
    'slots',public.mtrw_production_slots(p.level),
    'level',p.level,
    'xp',p.xp
  );
end;
$function$;

grant execute on function public.mtrw_collect_drug_production() to authenticated;
