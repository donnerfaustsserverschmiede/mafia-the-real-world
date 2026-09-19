-- MAFIVERA: unified level progression
-- xp stores progress toward the next level.
-- Level 0->1 needs 50 XP; each next level requires 25 more XP.
create or replace function public.mtrw_level_up(p_user uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  cur_level integer;
  cur_xp bigint;
  need_xp bigint;
begin
  select level, xp into cur_level, cur_xp from public.profiles where id=p_user for update;
  if not found then return; end if;
  cur_level := greatest(0, coalesce(cur_level,0));
  cur_xp := greatest(0, coalesce(cur_xp,0));
  need_xp := 50 + cur_level * 25;
  while cur_xp >= need_xp and cur_level < 50 loop
    cur_xp := cur_xp - need_xp;
    cur_level := cur_level + 1;
    need_xp := 50 + cur_level * 25;
  end loop;
  update public.profiles set level=cur_level,xp=cur_xp,updated_at=now() where id=p_user;
end
$function$;

-- Helper uses the same progression, interpreting p_xp as total accumulated XP.
create or replace function public.mtrw_level_for_xp(p_xp bigint)
returns integer
language plpgsql
immutable
as $function$
declare
  total bigint := greatest(0, coalesce(p_xp,0));
  lvl integer := 0;
  need bigint := 50;
begin
  while total >= need and lvl < 50 loop
    total := total - need;
    lvl := lvl + 1;
    need := 50 + lvl * 25;
  end loop;
  return lvl;
end
$function$;
