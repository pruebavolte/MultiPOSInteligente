import { createClient } from '@supabase/supabase-js';
import type { Database } from './client';
import { 
  getSupabaseAdmin as getSupabaseAdminFromFactory, 
  getActiveDatabase, 
  getSupabaseUrl,
  getSupabaseServiceKey,
  type DatabaseTarget 
} from './factory';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

function checkEnvVars() {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    const missingVars = [];
    if (!supabaseUrl) missingVars.push('NEXT_PUBLIC_SUPABASE_URL');
    if (!supabaseServiceRoleKey) missingVars.push('SUPABASE_SERVICE_ROLE_KEY');

    throw new Error(
      `Missing Supabase environment variables: ${missingVars.join(', ')}\n` +
      'Please check your .env file and restart the development server.'
    );
  }
}

let _supabaseAdmin: ReturnType<typeof createClient<Database>> | null = null;

export const supabaseAdmin = new Proxy({} as ReturnType<typeof createClient<Database>>, {
  get(target, prop) {
    if (!_supabaseAdmin) {
      checkEnvVars();
      _supabaseAdmin = getSupabaseAdminFromFactory();
    }
    return (_supabaseAdmin as any)[prop];
  }
});

export function getSupabaseAdminForDatabase(target: DatabaseTarget) {
  return getSupabaseAdminFromFactory(target);
}

export function getSupabaseCredentials(target: DatabaseTarget = getActiveDatabase()) {
  return {
    url: getSupabaseUrl(target),
    serviceKey: getSupabaseServiceKey(target),
  };
}

export { getActiveDatabase, type DatabaseTarget };
