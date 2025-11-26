import { createClient } from '@supabase/supabase-js';
import type { Database } from './client';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Función para verificar variables de entorno
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

// Solo verificar variables de entorno cuando se intente usar el cliente
let _supabaseAdmin: ReturnType<typeof createClient<Database>> | null = null;

// Cliente de Supabase para uso en servidor (con Service Role Key)
// ADVERTENCIA: Este cliente tiene permisos completos, úsalo solo en código del servidor
export const supabaseAdmin = new Proxy({} as ReturnType<typeof createClient<Database>>, {
  get(target, prop) {
    if (!_supabaseAdmin) {
      checkEnvVars();
      _supabaseAdmin = createClient<Database>(
        supabaseUrl,
        supabaseServiceRoleKey,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        }
      );
    }
    return (_supabaseAdmin as any)[prop];
  }
});
