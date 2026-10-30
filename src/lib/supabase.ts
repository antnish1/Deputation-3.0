import {createClient, type SupabaseClient} from '@supabase/supabase-js';
let client:SupabaseClient|null=null;
export function db(){const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;if(!url||!key)return null;return client??(client=createClient(url,key,{auth:{persistSession:true,autoRefreshToken:true}}));}
