-- MAFIVERA: Reputation is the single player XP/level progression value.
-- All players use exactly the same rule:
-- reputation = xp; level is derived from total reputation.
-- Level n threshold = 25 * 2^(n-1), capped at level 50.

create or replace function public.mtrw_level_for_xp(p_xp bigint)
returns integer
language sql
immutable
as $function$
  select case
    when greatest(0,coalesce(p_xp,0)) < 25 then 0
    else least(50, floor(log(greatest(1,greatest(0,coalesce(p_xp,0)))::numeric / 25) / log(2))::integer + 1)
  end
$function$;

create or replace function public.mtrw_level_up(p_user uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  update public.profiles
     set xp = greatest(0,coalesce(reputation,0)),
         level = public.mtrw_level_for_xp(greatest(0,coalesce(reputation,0))),
         updated_at = now()
   where id=p_user;
end
$function$;

create or replace function public.trg_profile_progression()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  new.reputation := greatest(0,coalesce(new.reputation,0));
  new.xp := new.reputation;
  new.level := public.mtrw_level_for_xp(new.reputation);
  return new;
end
$function$;

drop trigger if exists trg_profile_progression on public.profiles;
create trigger trg_profile_progression
before insert or update of reputation, xp, level
on public.profiles
for each row
execute function public.trg_profile_progression();

-- Repair all existing players from the same universal source of truth.
update public.profiles
set reputation = greatest(0,coalesce(reputation,0)),
    xp = greatest(0,coalesce(reputation,0)),
    level = public.mtrw_level_for_xp(greatest(0,coalesce(reputation,0))),
    updated_at = now();

-- Existing Donnerfaust progress is restored to the requested Level 20
-- using the exact same universal rule: Level 20 starts at 25 * 2^19 XP.
update public.profiles
set reputation = 25 * power(2,19)::bigint
where username='ThorsonDonnerfaust';

-- mafivera_bootstrap must never independently calculate level from xp.
-- It awards reputation; the trigger above mirrors reputation -> xp -> level.
