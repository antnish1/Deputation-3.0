-- Defense in depth: ensure daily assignment matches a rostered engineer,
-- stop client-side spoofing of submitted audit identity, and reject service jobs
-- dated outside their parent engineer-day.
create or replace function public.validate_deputation_day() returns trigger language plpgsql set search_path=public as $$
begin
 if not exists (select 1 from public.engineers e where e.id=new.engineer_id and e.home_branch_id=new.branch_id and e.active) then
   raise exception 'Engineer must be active in selected home branch';
 end if;
 if tg_op='INSERT' then
   if new.created_by<>auth.uid() or new.submitted_at is not null or new.submitted_by is not null then raise exception 'Invalid new deputation';end if;
 else
   if old.submitted_at is not null then raise exception 'Submitted deputation is locked';end if;
   if (new.submitted_at is null)<>(new.submitted_by is null) then raise exception 'Submitted by/time must be set together';end if;
   if new.submitted_by is not null and new.submitted_by<>auth.uid() then raise exception 'Invalid submitter';end if;
 end if;
 return new;
end $$;
create trigger validate_day_before_write before insert or update on public.daily_status for each row execute function public.validate_deputation_day();
create or replace function public.validate_service_job() returns trigger language plpgsql set search_path=public as $$
begin
 if not exists(select 1 from public.daily_status d where d.id=new.day_id and d.work_date=new.work_date and d.submitted_at is null) then raise exception 'Service job must belong to an open deputation on same day';end if;
 return new;
end $$;
create trigger validate_job_before_insert before insert on public.service_jobs for each row execute function public.validate_service_job();
