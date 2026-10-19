-- Restrict privileged trigger helpers from direct Data API invocation.
revoke all on function public.audit_phase1() from public, anon, authenticated;
revoke all on function public.rls_auto_enable() from public, anon, authenticated;
-- Branch predicate helpers are needed by RLS for authenticated users, not anonymous visitors.
revoke all on function public.my_role() from public, anon;
revoke all on function public.can_access_branch(uuid) from public, anon;
revoke all on function public.can_write_branch(uuid) from public, anon;
grant execute on function public.my_role() to authenticated;
grant execute on function public.can_access_branch(uuid) to authenticated;
grant execute on function public.can_write_branch(uuid) to authenticated;
alter function public.prevent_locked_day_changes() set search_path=public;
