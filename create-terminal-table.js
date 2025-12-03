const { Client } = require('pg');

async function createTable() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !serviceKey) {
    console.error('❌ Missing SUPABASE_URL or SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const urlObj = new URL(supabaseUrl);
  const host = urlObj.hostname;
  const project = host.split('.')[0];
  
  const connectionString = `postgresql://postgres.${project}:${encodeURIComponent(serviceKey)}@${host}:6543/postgres`;

  const client = new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('📡 Conectando a Supabase...');
    await client.connect();
    console.log('✅ Conectado!');

    const createTableSQL = `
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
    `;

    console.log('🔨 Creando tabla terminal_connections...');
    await client.query(createTableSQL);
    console.log('✅ ¡Tabla creada exitosamente en Supabase!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

createTable();
