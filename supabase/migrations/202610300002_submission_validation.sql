-- Server-side guard for submitting a completed engineer-day.
-- Stored drafts may be incomplete; submission cannot be.
create or replace function public.validate_daily_submission() returns trigger
language plpgsql set search_path=public as $$
begin
 if tg_op='UPDATE' and old.submitted_at is null and new.submitted_at is not null then
  if new.status in ('leave','absent','other') then
   if exists(select 1 from public.service_jobs where day_id=new.id) then
    raise exception 'Leave, Absent and Free cannot contain service calls. Correct the drafts before submitting';
   end if;
  elsif new.status in ('working','workshop') then
   if not exists(select 1 from public.service_jobs j where j.day_id=new.id) then
    raise exception 'Engineer % needs a completed service row before submission',new.engineer_id;
   end if;
   if exists (
     select 1 from public.service_jobs j where j.day_id=new.id and (
       nullif(btrim(coalesce(j.call_type,'')),'') is null or
       nullif(btrim(coalesce(j.complaint,'')),'') is null or
       nullif(btrim(coalesce(j.customer_name,'')),'') is null or
       nullif(btrim(coalesce(j.contact_number,'')),'') is null or
       nullif(btrim(coalesce(j.machine_number,'')),'') is null or
       j.hmr is null or
       nullif(btrim(coalesce(j.breakdown_status,'')),'') is null or
       nullif(btrim(coalesce(j.site_location,'')),'') is null
     )
   ) then raise exception 'Complete all daily deputation columns except Call ID before submission';end if;
  end if;
 end if;
 return new;
end $$;
create trigger daily_submission_validation before update on public.daily_status
for each row execute function public.validate_daily_submission();
revoke all on function public.validate_daily_submission() from public,anon,authenticated;
