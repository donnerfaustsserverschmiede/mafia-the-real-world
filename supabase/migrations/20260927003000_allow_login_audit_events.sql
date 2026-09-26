-- Allow synthetic authenticated login events in the central audit stream.
alter table public.mtrw_audit_events drop constraint if exists mtrw_audit_events_operation_check;
alter table public.mtrw_audit_events add constraint mtrw_audit_events_operation_check check (operation in ('INSERT','UPDATE','DELETE','LOGIN'));
