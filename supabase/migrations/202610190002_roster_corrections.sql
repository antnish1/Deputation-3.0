-- Phase 1 incremental migration; do not apply until reviewed against base schema.
create table public.deputation_correction_requests(
 id uuid primary key default gen_random_uuid(),
 day_id uuid not null references public.daily_status(id),
 requested_by uuid not null references auth.users(id),
 reason text not null check(length(trim(reason)) between 5 and 1000),
 state text not null default 'pending' check(state in ('pending','approved','rejected')),
 reviewed_by uuid references auth.users(id),
 reviewed_at timestamptz,
 review_note text,
 created_at timestamptz not null default now()
);
create unique index correction_one_pending_per_day on public.deputation_correction_requests(day_id) where state='pending';
alter table public.deputation_correction_requests enable row level security;
create policy correction_read on public.deputation_correction_requests for select to authenticated
 using(public.my_role() in ('admin','ho') or requested_by=auth.uid());
create policy correction_request on public.deputation_correction_requests for insert to authenticated
 with check(requested_by=auth.uid() and state='pending' and reviewed_by is null and reviewed_at is null
 and exists(select 1 from public.daily_status d where d.id=day_id and d.submitted_at is not null and public.can_write_branch(d.branch_id)));
-- Correction approvals intentionally remain an HO manual workflow; no client write access to change state.
-- Transactional and branch-scoped bulk draft status saving.
create or replace function public.save_daily_roster(p_branch_id uuid,p_date date,p_entries jsonb)
returns integer language plpgsql security invoker set search_path=public as $$
declare x jsonb; eid uuid; st text; cnt integer:=0;
begin
 if auth.uid() is null or not public.can_write_branch(p_branch_id) then raise exception 'Not authorized for branch'; end if;
 if p_date is null or p_entries is null or jsonb_typeof(p_entries)<>'array' or jsonb_array_length(p_entries)>150 then raise exception 'Invalid roster'; end if;
 for x in select * from jsonb_array_elements(p_entries) loop
   eid := (x->>'engineer_id')::uuid; st := x->>'status';
   if st not in ('working','workshop','leave','absent','holiday','weekly_off','training','other') then raise exception 'Invalid status';end if;
   if not exists(select 1 from public.engineers where id=eid and home_branch_id=p_branch_id and active=true) then raise exception 'Engineer not active in branch';end if;
   insert into public.daily_status(work_date,engineer_id,branch_id,status,created_by)
   values(p_date,eid,p_branch_id,st,auth.uid())
   on conflict(engineer_id,work_date) do update set status=excluded.status
   where public.daily_status.submitted_at is null;
   if not found then raise exception 'Cannot modify locked day';end if;
   cnt:=cnt+1;
 end loop;
 return cnt;
end $$;
revoke all on function public.save_daily_roster(uuid,date,jsonb) from public;
grant execute on function public.save_daily_roster(uuid,date,jsonb) to authenticated;
