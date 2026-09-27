-- MAFIVERA: prevent negative resource balances and repair existing negative Material
update public.profiles set material=0, updated_at=now() where material<0;
alter table public.profiles drop constraint if exists profiles_material_nonnegative;
alter table public.profiles add constraint profiles_material_nonnegative check (material >= 0);
alter table public.profiles drop constraint if exists profiles_weapon_parts_nonnegative;
alter table public.profiles add constraint profiles_weapon_parts_nonnegative check (weapon_parts >= 0);