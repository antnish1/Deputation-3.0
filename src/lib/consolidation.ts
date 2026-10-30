export type Submission={id:string;submitted_at:string|null;work_date:string;branch_id:string;engineer_id:string};
export type ServiceActivity={id:string;day_id:string;work_date:string};
export function officialDailyRecords<T extends Submission>(days:T[],date:string,branchId?:string):T[]{
 return days.filter(d=>d.work_date===date&&!!d.submitted_at&&(!branchId||d.branch_id===branchId));
}
export function officialServiceJobs<T extends ServiceActivity>(jobs:T[],submittedDays:Submission[]):T[]{
 const approved=new Set(submittedDays.filter(d=>!!d.submitted_at).map(d=>d.id));
 return jobs.filter(job=>approved.has(job.day_id));
}
