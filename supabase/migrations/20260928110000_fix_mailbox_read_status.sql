-- Mailbox read-status fix
-- Notifications must be markable as read even when they have already been resolved.
create or replace function public.mtrw_notification_read(p_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  update public.mtrw_notifications
     set read_at = coalesce(read_at, now())
   where id = p_id
     and user_id = (select auth.uid())
  returning true;
$$;

revoke all on function public.mtrw_notification_read(uuid) from public;
grant execute on function public.mtrw_notification_read(uuid) to authenticated;
