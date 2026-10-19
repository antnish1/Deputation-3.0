export type Role='admin'|'ho'|'service_manager'|'branch_manager'|'operator'|'viewer';
export type Branch={id:string;code:string;name:string};
export type Engineer={id:string;employee_code:string;name:string;home_branch_id:string;active:boolean};
export type DailyStatus='working'|'workshop'|'leave'|'absent'|'holiday'|'weekly_off'|'training'|'other';
export type Day={id:string;work_date:string;engineer_id:string;branch_id:string;status:DailyStatus;remarks:string|null;submitted_at:string|null;engineer?:Engineer;branch?:Branch};
export type Job={id:string;day_id:string;call_type:string|null;engineer_role:string|null;complaint:string|null;customer_name:string|null;contact_number:string|null;machine_number:string|null;hmr:number|null;breakdown_status:string|null;machine_model:string|null;installation_date:string|null;site_location:string|null;deputation_at:string|null;onsite_at:string|null;completion_at:string|null;call_id:string|null;labour_charge:number|null;distance_from_office:string|null};
export const branchesSeed=['Jabalpur BHL','Jabalpur HL','Anuppur','Damoh','Dindori','Narsinghpur','Mandla','Balaghat','Seoni','Katni'];
export const statuses:DailyStatus[]=['working','workshop','leave','absent','holiday','weekly_off','training','other'];
