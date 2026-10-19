import assert from 'node:assert/strict';
import test from 'node:test';
import {monthDates,attendanceSummary,csvEscape} from '../dist-test/attendance.js';
test('month boundaries including leap year',()=>{
 assert.equal(monthDates('2024-02').length,29);
 assert.equal(monthDates('2026-02').length,28);
 assert.equal(monthDates('2026-04').length,30);
 assert.equal(monthDates('2026-10').length,31);
 assert.throws(()=>monthDates('2026-13'));
});
test('multiple service jobs do not increase attendance days',()=>{
 const rows=[{engineer_id:'e1',work_date:'2026-10-01',status:'working'},{engineer_id:'e1',work_date:'2026-10-02',status:'leave'},{engineer_id:'e1',work_date:'2026-10-03',status:'weekly_off'},{engineer_id:'e1',work_date:'2026-10-04',status:'absent'},{engineer_id:'e2',work_date:'2026-10-01',status:'working'}];
 assert.deepEqual(attendanceSummary(rows,'e1','2026-10'),{recorded:4,provisionalWorking:1,leave:1,absent:1,weeklyOffOrHoliday:1,unrecorded:27});
});
test('duplicate engineer-day is rejected',()=>assert.throws(()=>attendanceSummary([{engineer_id:'e1',work_date:'2026-10-01',status:'working'},{engineer_id:'e1',work_date:'2026-10-01',status:'working'}],'e1','2026-10')));
test('CSV escaping protects formulas, quotes and delimiters',()=>{
 assert.equal(csvEscape('=HYPERLINK("bad")'),'"\'=HYPERLINK(""bad"")"');
 assert.equal(csvEscape('name, one'),'"name, one"');
});
