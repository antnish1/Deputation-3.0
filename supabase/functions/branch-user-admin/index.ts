import {createClient} from 'npm:@supabase/supabase-js@2.57.0';
const url=Deno.env.get('SUPABASE_URL')!;
const anon=Deno.env.get('SUPABASE_ANON_KEY')!;
const service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'};
Deno.serve(async(req)=>{
 if(req.method==='OPTIONS')return new Response('',{headers:cors});
 const respond=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json'}});
 if(req.method!=='POST')return respond({error:'Method not allowed'},405);
 const token=req.headers.get('Authorization')?.replace(/^Bearer /i,'');
 if(!token)return respond({error:'Authentication required'},401);
 const admin=createClient(url,service,{auth:{autoRefreshToken:false,persistSession:false}});
 const userClient=createClient(url,anon,{auth:{autoRefreshToken:false,persistSession:false}});
 const {data:{user},error:userError}=await userClient.auth.getUser(token);
 if(userError||!user)return respond({error:'Invalid session'},401);
 const {data:profile,error:profileError}=await admin.from('profiles').select('role').eq('id',user.id).single();
 if(profileError||profile?.role!=='admin')return respond({error:'Administrator role required'},403);
 let payload:Record<string,unknown>;try{payload=await req.json()}catch{return respond({error:'Invalid JSON'},400)}
 const action=String(payload.action||'');
 if(action==='list_users'){
  const {data,error}=await admin.from('profiles').select('id,display_name,role,branch_access(branch_id,branches(name))').eq('role','branch_manager').order('display_name');
  return error?respond({error:error.message},400):respond({users:data});
 }
 if(action==='create_user'){
  const email=String(payload.email||'').trim().toLowerCase(),password=String(payload.password||''),name=String(payload.name||'').trim(),branchId=String(payload.branch_id||'');
  if(!/^\S+@\S+\.\S+$/.test(email)||password.length<12||!name||!branchId)return respond({error:'Valid email, name, branch and a password of at least 12 characters are required'},400);
  const {data:branch}=await admin.from('branches').select('id').eq('id',branchId).single();if(!branch)return respond({error:'Invalid branch'},400);
  const {data:created,error:createError}=await admin.auth.admin.createUser({email,password,email_confirm:true});
  if(createError||!created.user)return respond({error:createError?.message||'Unable to create login'},400);
  const id=created.user.id;
  const {error:pError}=await admin.from('profiles').insert({id,display_name:name,role:'branch_manager'});
  const {error:bError}=pError?{error:pError}:await admin.from('branch_access').insert({user_id:id,branch_id:branchId});
  if(pError||bError){await admin.auth.admin.deleteUser(id);return respond({error:(pError||bError)?.message},400)}
  return respond({success:true,id});
 }
 if(action==='disable_user'){
  const id=String(payload.id||'');if(!id||id===user.id)return respond({error:'Invalid user'},400);
  const {data:p}=await admin.from('profiles').select('role').eq('id',id).single();if(p?.role!=='branch_manager')return respond({error:'Only branch accounts may be disabled here'},403);
  const {error}=await admin.auth.admin.updateUserById(id,{ban_duration:'876000h'});
  if(error)return respond({error:error.message},400);
  await admin.from('branch_access').delete().eq('user_id',id);
  return respond({success:true});
 }
 return respond({error:'Unsupported action'},400);
});