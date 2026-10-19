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

## Incremental milestone (October 19, 2026)
- Branch roster: select statuses for multiple active engineers; save selection as one SQL transaction. No default presence assumptions.
- Consolidation: separate status table for leave/absence without service activity.
- Attendance: provisional month grid, days 1 through final calendar day, with missing marked unrecorded.
- Submission completeness: home-branch engineer count compared with entered and submitted engineer-day rows.
- Correction requests: submitted entries can be flagged with a reason; the original stays locked.
- Migrations 002 and 003 add transactional roster writes, correction request record, and integrity triggers.
- **Not yet implemented:** HO review/approval of correction requests, re-opening and versioned adjustment records, final paid days, automatic holidays, cross-branch deputation, historical data import, and reconciliation.
- **Release blocker:** RLS and SQL migrations have not been tested on an isolated database; no live database connection has been configured. Browser-only tests and CI builds cannot prove RLS behavior.
- Supabase monthly queries now paginate in 500-row batches with a 100,000-row safety limit; validation with actual production-scale data remains necessary.

## Connected database verification — 2026-10-19
- Supabase project ref: `zvtaiaiatregbmidzchz` (Deputation 3.0, active/healthy).
- Public schema inspection returned zero tables. No database DDL or deployment performed in this verification.
- Workbook clarification: consolidation is an end-of-day copy of branch deputation; replace this with a query/view of submitted records, without copying rows into a second table. Keep draft vs submitted distinct.
- Attendance is formula-based in the original workbook, so no Apps Script handoff is necessary. Reconstruct calculations from actual workbook formulas and reconcile against representative historical periods before finalizing paid days.
- Supabase project is hosted in ap-northeast-1; consider regional latency from India when planning hosting but do not relocate without approval.

## Production readiness decision — 2026-10-19
- The connected Supabase project is currently empty. No migrations have been applied.
- Migration 004's HO reopening RPC relies on function-owner privileges and trigger checks. It is **NOT APPROVED FOR APPLICATION** until tested under real Auth roles, including forged API calls, denied direct updates and audit preservation. Do not apply these draft migrations as-is simply because frontend CI passes.
- Formal consolidation is a query over submitted engineer-days; no daily duplicate-copy table is required. Automated regression cases exercise branch filtering, exclusion of drafts and leave without service jobs.
- Next release gates: audit and harden migrations, exercise RLS and RPC in a disposable environment, import a verified engineer roster, reconcile workbook attendance formulas, configure publishable key, and complete user-acceptance testing.
