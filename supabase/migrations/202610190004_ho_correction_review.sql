-- Safe HO review: approval records a decision but NEVER unlocks or modifies submitted deputation.
-- Amendments will be implemented later as immutable versions with separate review and audit.
create or replace function public.review_deputation_correction(p_request_id uuid,p_decision text,p_review_note text default null)
returns void language plpgsql security definer set search_path=public as $$
declare req public.deputation_correction_requests%rowtype;
begin
 if auth.uid() is null or public.my_role() not in ('admin','ho') then
  raise exception 'HO authorization required';
 end if;
 if p_decision not in ('approved','rejected') then raise exception 'Invalid decision'; end if;
 select * into req from public.deputation_correction_requests where id=p_request_id and state='pending' for update;
 if not found then raise exception 'Pending request not found'; end if;
 update public.deputation_correction_requests
 set state=p_decision, reviewed_by=auth.uid(), reviewed_at=now(), review_note=nullif(trim(p_review_note),'')
 where id=req.id;
end $$;
revoke all on function public.review_deputation_correction(uuid,text,text) from public,anon;
grant execute on function public.review_deputation_correction(uuid,text,text) to authenticated;
-- Existing immutable daily_status triggers from 001 and 003 are intentionally unchanged.
