-- Phase 1 database schema. REVIEW BEFORE APPLYING. No production migration is performed by this PR.
create extension if not exists pgcrypto;
create table public.branches(id uuid primary key default gen_random_uuid(),code text not null unique,name text not null unique,active boolean not null default true);
create table public.profiles(id uuid primary key references auth.users(id) on delete cascade,display_name text not null,role text not null check(role in ('admin','ho','service_manager','branch_manager','operator','viewer')),created_at timestamptz not null default now());
create table public.branch_access(user_id uuid not null references public.profiles(id) on delete cascade,branch_id uuid not null references public.branches(id),primary key(user_id,branch_id));
create table public.engineers(id uuid primary key default gen_random_uuid(),employee_code text not null unique,name text not null,home_branch_id uuid not null references public.branches(id),active boolean not null default true,created_at timestamptz default now());
create table public.daily_status(id uuid primary key default gen_random_uuid(),work_date date not null,engineer_id uuid not null references public.engineers(id),branch_id uuid not null references public.branches(id),status text not null check(status in ('working','workshop','leave','absent','holiday','weekly_off','training','other')),remarks text,created_by uuid not null references auth.users(id),submitted_by uuid references auth.users(id),submitted_at timestamptz,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(engineer_id,work_date));
create index daily_status_branch_date_idx on public.daily_status(branch_id,work_date);
create table public.service_jobs(id uuid primary key default gen_random_uuid(),day_id uuid not null references public.daily_status(id) on delete restrict,work_date date not null,call_type text,engineer_role text,complaint text,customer_name text,contact_number text,machine_number text,hmr numeric(12,1) check(hmr>=0),breakdown_status text,machine_model text,installation_date date,site_location text,deputation_at timestamptz,onsite_at timestamptz,completion_at timestamptz,call_id text,labour_charge numeric(14,2) check(labour_charge>=0),distance_from_office text,created_at timestamptz not null default now());
create index service_jobs_day_idx on public.service_jobs(day_id);
create index service_jobs_date_idx on public.service_jobs(work_date);
create table public.audit_log(id bigint generated always as identity primary key,actor_id uuid,table_name text not null,record_id uuid not null,operation text not null,old_row jsonb,new_row jsonb,logged_at timestamptz not null default now());
create or replace function public.my_role() returns text language sql stable security definer set search_path=public as $$select role from public.profiles where id=auth.uid()$$;
create or replace function public.can_access_branch(b uuid) returns boolean language sql stable security definer set search_path=public as $$select coalesce(public.my_role() in ('admin','ho'),false) or exists(select 1 from public.branch_access where user_id=auth.uid() and branch_id=b)$$;
create or replace function public.can_write_branch(b uuid) returns boolean language sql stable security definer set search_path=public as $$select coalesce(public.my_role() in ('admin','ho','service_manager','branch_manager','operator'),false) and public.can_access_branch(b)$$;
alter table public.branches enable row level security;alter table public.profiles enable row level security;alter table public.branch_access enable row level security;alter table public.engineers enable row level security;alter table public.daily_status enable row level security;alter table public.service_jobs enable row level security;alter table public.audit_log enable row level security;
create policy branches_read on public.branches for select to authenticated using(public.can_access_branch(id));
create policy profiles_read on public.profiles for select to authenticated using(id=auth.uid() or public.my_role() in ('admin','ho'));
create policy branch_access_read on public.branch_access for select to authenticated using(user_id=auth.uid() or public.my_role() in ('admin','ho'));
create policy engineers_read on public.engineers for select to authenticated using(public.can_access_branch(home_branch_id));
create policy daily_read on public.daily_status for select to authenticated using(public.can_access_branch(branch_id));
create policy daily_insert on public.daily_status for insert to authenticated with check(public.can_write_branch(branch_id) and created_by=auth.uid() and submitted_at is null and submitted_by is null);
create policy daily_update on public.daily_status for update to authenticated using(public.can_write_branch(branch_id) and submitted_at is null) with check(public.can_write_branch(branch_id) and (submitted_by is null or submitted_by=auth.uid()));
create policy jobs_read on public.service_jobs for select to authenticated using(exists(select 1 from public.daily_status d where d.id=day_id and public.can_access_branch(d.branch_id)));
create policy jobs_insert on public.service_jobs for insert to authenticated with check(exists(select 1 from public.daily_status d where d.id=day_id and d.work_date=work_date and d.submitted_at is null and public.can_write_branch(d.branch_id)));
create or replace function public.prevent_locked_day_changes() returns trigger language plpgsql as $$begin
 if tg_op='UPDATE' then
  if old.submitted_at is not null then raise exception 'Submitted deputation is immutable';end if;
  if (old.engineer_id,old.work_date,old.branch_id,old.created_by) is distinct from (new.engineer_id,new.work_date,new.branch_id,new.created_by) then raise exception 'Assignment identity cannot be changed';end if;
 end if;
 return new;
end$$;
create trigger lock_daily_before_update before update on public.daily_status for each row execute function public.prevent_locked_day_changes();
create or replace function public.audit_phase1() returns trigger language plpgsql security definer set search_path=public as $$begin
 insert into public.audit_log(actor_id,table_name,record_id,operation,old_row,new_row) values(auth.uid(),tg_table_name,coalesce(new.id,old.id),tg_op,case when tg_op='INSERT' then null else to_jsonb(old) end,case when tg_op='DELETE' then null else to_jsonb(new) end);
 return coalesce(new,old);
end$$;
create trigger audit_daily after insert or update or delete on public.daily_status for each row execute function public.audit_phase1();
create trigger audit_job after insert or update or delete on public.service_jobs for each row execute function public.audit_phase1();
-- Missing engineers, branch memberships and user provisioning must be imported separately after review.
insert into public.branches(code,name) values
('JBP-BHL','Jabalpur BHL'),('JBP-HL','Jabalpur HL'),('ANUPPUR','Anuppur'),('DAMOH','Damoh'),('DINDORI','Dindori'),('NARSINGHPUR','Narsinghpur'),('MANDLA','Mandla'),('BALAGHAT','Balaghat'),('SEONI','Seoni'),('KATNI','Katni')
on conflict(code) do nothing;
