-- HO-only correction review. Atomic approval reopens a locked day, retaining all audit history.
-- Designed for approval review; no migration has been executed.
create or replace function public.review_deputation_correction(p_request_id uuid,p_decision text,p_review_note text default null)
returns void language plpgsql security definer set search_path=public as $$
declare req public.deputation_correction_requests%rowtype;
begin
 if auth.uid() is null or public.my_role() not in ('admin','ho') then raise exception 'HO authorization required';end if;
 if p_decision not in ('approved','rejected') then raise exception 'Invalid decision';end if;
 select * into req from public.deputation_correction_requests where id=p_request_id and state='pending' for update;
 if not found then raise exception 'Pending request not found';end if;
 if p_decision='approved' then
   -- The original submission and its correction reason remain in audit_log and correction_requests.
   update public.daily_status set submitted_at=null,submitted_by=null where id=req.day_id and submitted_at is not null;
   if not found then raise exception 'Day already open or missing';end if;
 end if;
 update public.deputation_correction_requests set state=p_decision,reviewed_by=auth.uid(),reviewed_at=now(),review_note=p_review_note where id=req.id;
end $$;
revoke all on function public.review_deputation_correction(uuid,text,text) from public;
grant execute on function public.review_deputation_correction(uuid,text,text) to authenticated;

-- Permit only the HO review RPC to reopen, and never permit arbitrary clients to remove submission timestamps.
-- Trigger executes while security-definer function owns an authorized workflow context.
create or replace function public.prevent_locked_day_changes() returns trigger language plpgsql set search_path=public as $$
begin
 if tg_op='UPDATE' then
  if old.submitted_at is not null and not (public.my_role() in ('admin','ho') and new.submitted_at is null and new.submitted_by is null and
    current_user = 'postgres') then raise exception 'Submitted deputation is immutable'; end if;
  if (old.engineer_id,old.work_date,old.branch_id,old.created_by) is distinct from (new.engineer_id,new.work_date,new.branch_id,new.created_by) then raise exception 'Assignment identity cannot be changed';end if;
 end if;
 return new;
end $$;
create or replace function public.validate_deputation_day() returns trigger language plpgsql set search_path=public as $$
begin
 if not exists(select 1 from public.engineers e where e.id=new.engineer_id and e.home_branch_id=new.branch_id and e.active) then raise exception 'Engineer must be active in branch';end if;
 if tg_op='INSERT' then
  if new.created_by<>auth.uid() or new.submitted_at is not null or new.submitted_by is not null then raise exception 'Invalid new deputation';end if;
 else
  if old.submitted_at is not null and not (public.my_role() in ('admin','ho') and new.submitted_at is null and new.submitted_by is null and current_user='postgres') then raise exception 'Submitted deputation locked';end if;
  if (new.submitted_at is null)<>(new.submitted_by is null) then raise exception 'Invalid submission values';end if;
  if new.submitted_by is not null and new.submitted_by<>auth.uid() then raise exception 'Invalid submitter';end if;
 end if;
 return new;
end $$;
