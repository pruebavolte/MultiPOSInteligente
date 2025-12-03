import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL_2;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY_2;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Falta SUPABASE_URL_2 o SUPABASE_SERVICE_ROLE_KEY_2');
  console.log('URL:', supabaseUrl ? 'configured' : 'missing');
  console.log('Key:', serviceRoleKey ? 'configured' : 'missing');
  process.exit(1);
}

console.log('📡 Conectando a Supabase secundario:', supabaseUrl);

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function createTable() {
  console.log('🔨 Verificando tabla terminal_connections...');
  
  // Check if table exists by trying to select from it
  const { data: existingData, error: selectError } = await supabase
    .from('terminal_connections')
    .select('id')
    .limit(1);
  
  if (selectError && selectError.code === '42P01') {
    console.log('❌ Tabla no existe. Necesitas crearla manualmente en Supabase SQL Editor:');
    console.log(`
-- Ejecuta este SQL en tu Supabase Dashboard → SQL Editor:

CREATE TABLE IF NOT EXISTS terminal_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    provider TEXT NOT NULL,
    mp_user_id TEXT,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    public_key TEXT,
    token_expires_at TIMESTAMPTZ,
    live_mode BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'connected',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, provider)
);

ALTER TABLE terminal_connections ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_terminal_connections_user_provider 
    ON terminal_connections(user_id, provider);
    `);
  } else if (selectError) {
    console.error('❌ Error al verificar tabla:', selectError.message);
  } else {
    console.log('✅ ¡Tabla terminal_connections ya existe en la BD secundaria!');
  }
}

createTable();
