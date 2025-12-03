import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Falta SUPABASE_URL o SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function createTable() {
  try {
    console.log('🔨 Creando tabla terminal_connections en Supabase...');
    
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
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
        CREATE INDEX IF NOT EXISTS idx_terminal_connections_user_provider ON terminal_connections(user_id, provider);
      `
    });

    if (error) throw error;
    console.log('✅ ¡Tabla creada en Supabase!');
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.log('ℹ️ Quizás el RPC no existe. Intentando método alternativo...');
  }
}

createTable();
