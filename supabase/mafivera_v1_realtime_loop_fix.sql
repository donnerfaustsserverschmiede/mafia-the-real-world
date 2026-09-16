-- MAFIVERA V1: profile updates are polled by the client; do not publish them to realtime.
DO $$ begin
  begin execute 'alter publication supabase_realtime drop table public.profiles';
  exception when undefined_object then null; when undefined_table then null;
  end;
END $$;
