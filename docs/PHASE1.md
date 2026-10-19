# Phase 1 — Deputation, Consolidation, Attendance

## Scope
Daily engineer status and service activities, branch submissions, live consolidated service register, provisional monthly attendance. **No TA/DA processing, Engg_Data or SVR workflows in this phase**.

## Installation
1. `npm install`
2. Copy `.env.example` to `.env.local` and configure a **dedicated** Supabase project.
3. REVIEW `supabase/migrations/202610190001_phase1.sql` and apply only after database approval; none was applied automatically.
4. Create Auth users and their `profiles`, then map `branch_access`, populate engineers. Admin/HO see all branches. Other roles only see assigned branches.
5. `npm run dev` (no configured database means the app displays a setup-required screen).

## Workbook mapping
The ten branch sheets contain up to 27 columns A:AA. Daily status stores date, engineer, branch, status and remarks. Additional job rows carry call type, primary/secondary role, complaint, customer, mobile, machine, HMR, breakdown, model, installation, site, deputation and onsite/complete times, call ID, labour and distance. TA and DA values remain out of scope and are **not migrated into editable Phase 1 data**. Consolidation maps legacy columns by header meaning, not letter. The legacy `CONSOLIDATION` sheet and `Attendance` must be reconciled in a later import script.

## Known limits, release gates
- The attendance view is **provisional**: working/workshop/training are counted as worked; missing dates are not absence; approved holidays, Sundays, leave policy and paid days need business sign-off.
- Branch selection is constrained at database level by RLS. Branch managers may not provision themselves or view branches not assigned.
- Submitted records are immutable. Correction flow by HO is not implemented yet; do not migrate live operation until it exists.
- Initial branch roster and profile provisioning are deliberate admin tasks; no synthetic live engineer data.
- Future enhancements: dedicated holiday calendar, versioned attendance rules, date-wise attendance grid, editable job corrections before submission, CSV imports and historical reconciliation, submission completeness checks, exports and regression coverage.
- This is a code baseline, not a completed production system. Do not deploy or merge without review.

## Data guarantees
- One daily status per engineer and date, many job rows per daily status.
- Unique engineer employee code, unique branches, service-job/date consistency, lock after submission, audit history.
- Postgres RLS prevents cross-branch reading/writing; UI filters supplement security but do not replace it.
- In any import, preserve source spreadsheet/sheet/row in separate staging tables and deduplicate prior to final insert.
