-- Keep resource values valid and make the fix durable for every player.
update public.profiles
set material=greatest(0,coalesce(material,0)),
    weapon_parts=greatest(0,coalesce(weapon_parts,0)),
    updated_at=now()
where material<0 or weapon_parts<0;

alter table public.profiles drop constraint if exists profiles_material_nonnegative;
alter table public.profiles add constraint profiles_material_nonnegative check (material >= 0);
alter table public.profiles drop constraint if exists profiles_weapon_parts_nonnegative;
alter table public.profiles add constraint profiles_weapon_parts_nonnegative check (weapon_parts >= 0);