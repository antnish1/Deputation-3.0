-- Admin-only engineer master operations. Preserve historic rows via soft deletion.
create policy engineers_insert_admin on public.engineers for insert to authenticated
with check(public.my_role()='admin');
create policy engineers_update_admin on public.engineers for update to authenticated
using(public.my_role()='admin') with check(public.my_role()='admin');
-- Admin may see active + inactive engineers in a separate settings query.
-- Only approved branch managers may read assigned branches under existing RLS.
