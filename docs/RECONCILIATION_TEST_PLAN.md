# Phase 1 historical reconciliation and acceptance

## Historical workbook import (NOT YET EXECUTED)
Source: FCV Deputation 2.0 branch sheets, CONSOLIDATION, Attendance. Preserve an immutable copy. Do not make retrospective corrections during import. Record source workbook, tab, sheet row, snapshot date, imported_by, import batch id and content hash.

## Reconciliation checks
1. Normalize all branch spellings and map stable employee IDs before importing historical records.
2. Per branch/day compare engineer attendance rows and unrecorded engineers.
3. Compare unique engineer/date combinations, not raw call counts, with attendance.
4. Compare each service activity's call ID, machine number, HMR, customer, timestamps and labour against consolidation; do not infer leave from missing calls.
5. Flag duplicate engineer/date statuses; treat multiple calls as child service jobs.
6. Calculate a branch/day gap report: legacy records, database records, mismatches, unmatched engineers, unmatched calls and invalid dates.
7. Validate Sundays, holidays, leave, paid-day calculation separately. No payroll sign-off until approved policy defined.
8. Review sample weeks across multiple months, holiday weeks, month boundaries and cases with multi-call engineers.
9. Confirm RLS using real test users assigned different branches and HO users.
10. Prevent go-live unless all exceptions are documented and signed off by HO.

## Manual test cases
- Sign-in without profile sees no writable controls.
- Branch manager sees only authorized branches via RLS even with manually forged requests.
- Save multiple statuses, reload, verify each retained correctly.
- Multiple jobs for one day count one attendance unit.
- Leave/absence record shows in consolidation even when no service job exists.
- Submitted status is immutable; a correction request cannot directly change it.
- HO can approve correction in a reviewed SQL environment; old submission remains auditable; reopened day can be corrected and resubmitted.
- Non-HO cannot call correction review RPC.
- Month of February renders correct day count; April has 30 days.
- Exported consolidation only contains accessible records for selected date.
- Validate 1,001+ service jobs and 1,001+ engineer-days for pagination.

## Database release gates
Do not apply migrations to the production database until tested against a disposable database. The review function uses database-owner execution context to reopen rows; verify owner, trigger semantics, and privilege boundaries using an integration test before release. Prefer a dedicated audited RPC for resubmission and correction over direct client updates in a production hardening pass.

## Attendance policy pending
Statuses P/W/T count provisionally. Distinguish approved leave, weekly off, holiday, working Sundays, half-days, branch transfer and effective-dated engineer roster. Never calculate paid days from provisional values.
