import type {DailyStatus} from './types';
export type AttendanceEntry={engineer_id:string;work_date:string;status:DailyStatus;submitted_at?:string|null};
export type AttendanceSummary={recorded:number;provisionalWorking:number;leave:number;absent:number;weeklyOffOrHoliday:number;unrecorded:number};
export function monthDates(month:string):string[]{
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))throw new Error('Invalid month');
 const [year,mo]=month.split('-').map(Number);
 const days=new Date(Date.UTC(year,mo,0)).getUTCDate();
 return Array.from({length:days},(_,i)=>month+'-'+String(i+1).padStart(2,'0'));
}
export function attendanceSummary(entries:AttendanceEntry[],engineerId:string,month:string):AttendanceSummary{
 const dates=monthDates(month),seen=new Map<string,DailyStatus>();
 for(const record of entries){
  if(record.engineer_id!==engineerId||!record.work_date.startsWith(month+'-'))continue;
  if(seen.has(record.work_date))throw new Error('Duplicate engineer-day record: '+record.work_date);
  seen.set(record.work_date,record.status);
 }
 const counts=(...statuses:DailyStatus[])=>[...seen.values()].filter(s=>statuses.includes(s)).length;
 return {recorded:seen.size,provisionalWorking:counts('working','workshop','training'),leave:counts('leave'),absent:counts('absent'),weeklyOffOrHoliday:counts('weekly_off','holiday'),unrecorded:dates.length-seen.size};
}
export function csvEscape(value:unknown):string{
 const s=String(value??'');
 // Prevent spreadsheet formula execution when exported files are opened in Excel or Sheets.
 const safe=/^[\s]*[=+@-]/.test(s)?"'"+s:s;
 return '"'+safe.replaceAll('"','""')+'"';
}
