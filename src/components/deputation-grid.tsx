'use client';
import {useEffect,useMemo,useState} from 'react';
import type {SupabaseClient} from '@supabase/supabase-js';
import type {Engineer,Day,Job,DailyStatus} from '@/lib/types';
type Entry={key:string;engineer_id:string;status:DailyStatus;existingDay?:Day;existingJob?:Job;job:Record<string,string>;dirty:boolean};
const keys=['call_type','engineer_role','complaint','customer_name','contact_number','machine_number','hmr','breakdown_status','machine_model','installation_date','site_location','deputation_at','onsite_at','completion_at','call_id','labour_charge','distance_from_office'] as const;
const columns=[{letter:'C',label:'Engineer Name'},{letter:'D',label:'Workshop / Onsite'},{letter:'E',label:'Call Type'},{letter:'G',label:'Complaint'},{letter:'H',label:'Customer Name'},{letter:'I',label:'Contact Number'},{letter:'J',label:'Machine Number'},{letter:'K',label:'HMR'},{letter:'L',label:'Breakdown Status'},{letter:'O',label:'Site Location'},{letter:'U',label:'Call ID'}];
const states:DailyStatus[]=['working','workshop','leave','absent','holiday','weekly_off','training','other'];
const display=(x:string)=>x.replaceAll('_',' ').replace(/^./,c=>c.toUpperCase());
const jobFrom=(j?:Job):Record<string,string>=>Object.fromEntries(keys.map(k=>[k,j?.[k]==null?'':String(j[k])]));
const blank=(engineer_id:string,index:number):Entry=>({key:engineer_id+'-'+index,engineer_id,status:'working',job:jobFrom(),dirty:false});
const datePart=(date:string|null|undefined)=>date?.slice(0,10)||'';
const timePart=(date:string|null|undefined)=>date?.slice(11,16)||'';
const toIso=(d:string,t:string)=>d&&t?new Date(d+'T'+t+':00').toISOString():null;
export function DeputationGrid({supabase,engineers,days,jobs,branch,branchName,date,onReload,notify}:{supabase:SupabaseClient;engineers:Engineer[];days:Day[];jobs:Job[];branch:string;branchName:string;date:string;onReload:()=>Promise<void>;notify:(s:string)=>void}){
 const roster=useMemo(()=>engineers.filter(e=>e.home_branch_id===branch),[engineers,branch]);
 const [entries,setEntries]=useState<Entry[]>([]),[saving,setSaving]=useState(false),[filter,setFilter]=useState(''),[statusFilter,setStatusFilter]=useState('all');
 useEffect(()=>{
  const result:Entry[]=[];
  for(const e of roster){
   const day=days.find(d=>d.engineer_id===e.id&&d.work_date===date);
   const related=day?jobs.filter(j=>j.day_id===day.id):[];
   if(!related.length)result.push({...blank(e.id,0),status:day?.status||'working',existingDay:day});
   related.forEach((j,i)=>result.push({...blank(e.id,i),status:day!.status,existingDay:day,existingJob:j,job:jobFrom(j)}));
  }
  setEntries(result);
 },[roster,days,jobs,date]);
 const alter=(key:string,field:string,value:string)=>setEntries(p=>p.map(r=>r.key!==key?r:{...r,...(field==='status'?{status:value as DailyStatus}:{job:{...r.job,[field]:value}}),dirty:true}));
 const addJob=(e:Entry)=>setEntries(p=>{const same=p.filter(r=>r.engineer_id===e.engineer_id);return [...p.slice(0,p.findIndex(r=>r.key===same[same.length-1].key)+1),{...blank(e.engineer_id,Date.now()),status:e.status,existingDay:e.existingDay,dirty:true},...p.slice(p.findIndex(r=>r.key===same[same.length-1].key)+1)]});
 const save=async()=>{
  const changed=entries.filter(e=>e.dirty&&!e.existingDay?.submitted_at);
  if(!changed.length){notify('No unsaved changes.');return}
  setSaving(true);
  try{
   const {data:auth,error:authError}=await supabase.auth.getUser();if(authError||!auth.user)throw new Error('Please sign in again');
   const unique=new Map<string,Entry>();for(const item of changed)unique.set(item.engineer_id,item);
   for(const e of unique.values()){
    const existing=days.find(d=>d.work_date===date&&d.engineer_id===e.engineer_id);
    if(existing?.submitted_at)throw new Error('Submitted records are locked');
    const {error}=await supabase.from('daily_status').upsert({...(existing?{id:existing.id}:{}),work_date:date,engineer_id:e.engineer_id,branch_id:branch,status:e.status,created_by:auth.user.id},{onConflict:'engineer_id,work_date'});
    if(error)throw new Error(error.message);
   }
   const {data:dayRows,error:lookupError}=await supabase.from('daily_status').select('id,engineer_id').eq('work_date',date).eq('branch_id',branch);
   if(lookupError)throw new Error(lookupError.message);
   for(const e of changed){
    if(e.existingJob){notify('Existing service jobs are currently read-only. New rows and status changes were saved; use a correction request for submitted data.');continue;}
    if(!Object.values(e.job).some(v=>v.trim()))continue;
    const dayId=dayRows?.find(d=>d.engineer_id===e.engineer_id)?.id;
    if(!dayId)throw new Error('Missing engineer-day record');
    const j=e.job;
    const payload={day_id:dayId,work_date:date,call_type:j.call_type||null,engineer_role:j.engineer_role||null,complaint:j.complaint||null,customer_name:j.customer_name||null,contact_number:j.contact_number||null,machine_number:j.machine_number||null,hmr:j.hmr?Number(j.hmr):null,breakdown_status:j.breakdown_status||null,machine_model:j.machine_model||null,installation_date:j.installation_date||null,site_location:j.site_location||null,deputation_at:toIso(j.deputation_at.slice(0,10),j.deputation_at.slice(11,16)),onsite_at:toIso(j.onsite_at.slice(0,10),j.onsite_at.slice(11,16)),completion_at:toIso(j.completion_at.slice(0,10),j.completion_at.slice(11,16)),call_id:j.call_id||null,labour_charge:j.labour_charge?Number(j.labour_charge):null,distance_from_office:j.distance_from_office||null};
    const {error}=await supabase.from('service_jobs').insert(payload);if(error)throw new Error(error.message);
   }
   notify('Spreadsheet entries saved.');await onReload();
  }catch(e){notify(e instanceof Error?e.message:String(e))}finally{setSaving(false)}
 };
 const shown=entries.filter(e=>(statusFilter==='all'||e.status===statusFilter)&&(!filter||roster.find(x=>x.id===e.engineer_id)?.name.toLowerCase().includes(filter.toLowerCase())));
 const input=(e:Entry,k:string,type='text')=><input aria-label={display(k)} disabled={!!e.existingDay?.submitted_at||!!e.existingJob} type={type} value={e.job[k]||''} onChange={ev=>alter(e.key,k,ev.target.value)}/>;
 return <section className="gridPanel">
  <div className="gridToolbar"><div><h2>Daily Deputation Register</h2><p>{branchName} · {date} · Compact register · original column references retained</p></div><div className="gridButtons"><span className="gridCount">{entries.filter(e=>e.dirty).length} unsaved rows</span><button disabled={saving||!entries.some(e=>e.dirty)} onClick={()=>void save()}>{saving?'Saving…':'Save Changes'}</button></div></div>
  <div className="gridFilters"><input placeholder="Find engineer…" value={filter} onChange={e=>setFilter(e.target.value)}/><select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option value="all">All statuses</option>{states.map(s=><option key={s} value={s}>{display(s)}</option>)}</select><span>Scroll horizontally to view every column</span></div>
  <div className="sheetScroll"><table className="sheetTable"><thead><tr>{columns.map((c,i)=><th key={c.letter} className={i===0?'stickyEngineer':''}><small>{c.letter}</small>{c.label}</th>)}<th>Actions</th></tr></thead><tbody>{shown.map(e=>{const engineer=roster.find(x=>x.id===e.engineer_id);const locked=!!e.existingDay?.submitted_at;return <tr key={e.key} className={locked?'sheetLocked':''}><td className="stickyEngineer">{engineer?.name||'Unknown'}</td><td><select disabled={locked} value={e.status} onChange={ev=>alter(e.key,'status',ev.target.value)}>{states.map(status=><option key={status} value={status}>{display(status)}</option>)}</select></td>{(['call_type','complaint','customer_name','contact_number','machine_number','hmr','breakdown_status','site_location','call_id'] as const).map(k=><td key={k}>{input(e,k,k==='hmr'?'number':'text')}</td>)}<td><button className="sheetAdd" disabled={locked} onClick={()=>addJob(e)}>+ Call</button></td></tr>})}</tbody></table></div>
  <p className="gridFoot">Existing submitted rows remain locked. Removed fields are retained in stored historical records; only the requested columns appear in this grid.</p>
 </section>
}
