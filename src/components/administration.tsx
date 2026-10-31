'use client';
import {useCallback,useEffect,useState} from 'react';
import type {SupabaseClient} from '@supabase/supabase-js';
import type {Branch,Engineer} from '@/lib/types';
type Account={id:string;display_name:string;role:string;branch_access?:{branch_id:string;branches?:{name:string}|null}[]};
export function Administration({supabase,branches,engineers,reload,notify}:{supabase:SupabaseClient;branches:Branch[];engineers:Engineer[];reload:()=>Promise<void>;notify:(s:string)=>void}){
 const [accounts,setAccounts]=useState<Account[]>([]),[selected,setSelected]=useState(branches[0]?.id||''),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[name,setName]=useState(''),[employeeName,setEmployeeName]=useState(''),[employeeCode,setEmployeeCode]=useState(''),[busy,setBusy]=useState(false);
 const api=useCallback(async (payload:Record<string,unknown>)=>{
  const {data:{session}}=await supabase.auth.getSession();if(!session)throw new Error('Sign in required');
  const {data,error}=await supabase.functions.invoke('branch-user-admin',{body:payload});
  if(error){const response=(error as {context?:Response}).context;let detail='';if(response?.json){try{const body=await response.json();detail=String(body?.error||body?.message||'')}catch{}}throw new Error(detail||error.message)}
  if(data?.error)throw new Error(data.error);
  return data;
 },[supabase]);
 const refresh=useCallback(async()=>{try{const r=await api({action:'list_users'});setAccounts(r.users||[])}catch(e){notify(e instanceof Error?e.message:String(e))}},[api,notify]);
 useEffect(()=>{void refresh()},[refresh]);
 async function act(action:()=>Promise<void>){setBusy(true);try{await action()}catch(e){notify(e instanceof Error?e.message:String(e))}finally{setBusy(false)}}
 const current=engineers.filter(e=>e.home_branch_id===selected);
 return <div className="adminWorkspace">
  <section className="panel"><h2>Branch Login Management</h2><p>Create restricted branch-manager accounts. Passwords are never stored in application tables.</p>
   <div className="adminFields"><label>Branch<select value={selected} onChange={e=>setSelected(e.target.value)}>{branches.map(b=><option value={b.id} key={b.id}>{b.name}</option>)}</select></label><label>Name<input value={name} onChange={e=>setName(e.target.value)} placeholder="Branch manager"/></label><label>Login email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="manager@company.com"/></label><label>Initial password<input type="password" autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Minimum 12 characters"/></label></div>
   <div className="adminActions"><button disabled={busy||!selected||!name||!email||password.length<12} onClick={()=>void act(async()=>{await api({action:'create_user',email,password,name,branch_id:selected});setEmail('');setPassword('');setName('');notify('Branch login created.');await refresh()})}>Create Branch Login</button></div>
   <div className="tableScroll"><table><thead><tr><th>Manager</th><th>Assigned branch</th><th>Action</th></tr></thead><tbody>{accounts.map(a=><tr key={a.id}><td>{a.display_name}</td><td>{a.branch_access?.map(x=>x.branches?.name||'Assigned branch').join(', ')||'—'}</td><td><button className="textButton" disabled={busy} onClick={()=>{if(!confirm('Disable this login? They will lose branch access.'))return;void act(async()=>{await api({action:'disable_user',id:a.id});notify('Branch login disabled.');await refresh()})}}>Disable login</button></td></tr>)}</tbody></table></div>
  </section>
  <section className="panel"><h2>Engineer Master</h2><p>Deactivation removes engineers from future daily rosters while preserving historical records.</p>
   <div className="adminFields"><label>Branch<select value={selected} onChange={e=>setSelected(e.target.value)}>{branches.map(b=><option value={b.id} key={b.id}>{b.name}</option>)}</select></label><label>Employee code<input value={employeeCode} onChange={e=>setEmployeeCode(e.target.value)} placeholder="Unique code"/></label><label>Engineer name<input value={employeeName} onChange={e=>setEmployeeName(e.target.value)} placeholder="Full name"/></label><div className="adminActions"><button disabled={busy||!selected||!employeeName.trim()||!employeeCode.trim()} onClick={()=>void act(async()=>{const {error}=await supabase.from('engineers').insert({name:employeeName.trim(),employee_code:employeeCode.trim(),home_branch_id:selected,active:true});if(error)throw error;setEmployeeName('');setEmployeeCode('');notify('Engineer added.');await reload()})}>Add Engineer</button></div></div>
   <div className="tableScroll"><table><thead><tr><th>Engineer</th><th>Code</th><th>Action</th></tr></thead><tbody>{current.map(e=><tr key={e.id}><td>{e.name}</td><td>{e.employee_code}</td><td><button className="textButton" disabled={busy} onClick={()=>{if(!confirm('Deactivate '+e.name+'? Historical deputation will be preserved.'))return;void act(async()=>{const {error}=await supabase.from('engineers').update({active:false}).eq('id',e.id);if(error)throw error;notify('Engineer deactivated.');await reload()})}}>Remove from roster</button></td></tr>)}</tbody></table></div>
  </section>
 </div>;
}