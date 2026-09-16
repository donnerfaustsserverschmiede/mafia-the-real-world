-- MAFIVERA V1: each recruitment center owns its own production clock.
alter table public.world_territories add column if not exists recruit_last_at timestamptz;
-- The production function is applied in the live project by the matching migration.
