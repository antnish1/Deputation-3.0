import test from 'node:test';
import assert from 'node:assert/strict';
import {officialDailyRecords,officialServiceJobs} from '../dist-test/consolidation.js';
test('drafts and other dates never enter official consolidation',()=>{
 const d=[{id:'1',engineer_id:'e1',branch_id:'b1',work_date:'2026-10-19',submitted_at:'2026-10-19T12:00:00Z'},{id:'2',engineer_id:'e2',branch_id:'b1',work_date:'2026-10-19',submitted_at:null},{id:'3',engineer_id:'e3',branch_id:'b2',work_date:'2026-10-19',submitted_at:'2026-10-19T12:00:00Z'},{id:'4',engineer_id:'e4',branch_id:'b1',work_date:'2026-10-18',submitted_at:'2026-10-18T12:00:00Z'}];
 assert.deepEqual(officialDailyRecords(d,'2026-10-19','b1').map(x=>x.id),['1']);
 assert.deepEqual(officialServiceJobs([{id:'j1',day_id:'1',work_date:'2026-10-19'},{id:'j2',day_id:'2',work_date:'2026-10-19'},{id:'j3',day_id:'3',work_date:'2026-10-19'}],officialDailyRecords(d,'2026-10-19','b1')).map(x=>x.id),['j1']);
});
test('submitted leave without a service job remains in status consolidation',()=>{
 const d=[{id:'1',engineer_id:'e1',branch_id:'b1',work_date:'2026-10-19',submitted_at:'2026-10-19T12:00:00Z'}];
 assert.equal(officialDailyRecords(d,'2026-10-19').length,1);
 assert.equal(officialServiceJobs([],d).length,0);
});
