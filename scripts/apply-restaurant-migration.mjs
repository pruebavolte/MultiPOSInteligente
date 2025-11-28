#!/usr/bin/env tsx

/**
 * Script para aplicar la migración de restaurant_id
 *
 * Este script aplica la migración 008_add_restaurant_id_to_users.sql
 * que agrega el campo restaurant_id a la tabla users para vincular
 * clientes con sus restaurantes.
 *
 * Uso:
 *   npx tsx scripts/apply-restaurant-migration.ts
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Faltan variables de entorno');
  console.error('   Asegúrate de tener NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  try {
    console.log('🚀 Aplicando migración 008_add_restaurant_id_to_users.sql...\n');

    // Read migration file
    const migrationPath = path.join(
      process.cwd(),
      'supabase',
      'migrations',
      '008_add_restaurant_id_to_users.sql'
    );

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Execute migration
    const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL });

    if (error) {
      // Try direct execution if exec_sql doesn't exist
      console.log('⚠️  exec_sql no disponible, intentando ejecución directa...\n');

      // Split by semicolons and execute each statement
      const statements = migrationSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (const statement of statements) {
        const { error: stmtError } = await supabase.rpc('exec', {
          query: statement + ';'
        });

        if (stmtError) {
          console.error('❌ Error ejecutando statement:', stmtError);
          throw stmtError;
        }
      }
    }

    console.log('✅ Migración aplicada exitosamente!\n');
    console.log('📝 Cambios realizados:');
    console.log('   - Se agregó columna restaurant_id a la tabla users');
    console.log('   - Se creó índice idx_users_restaurant_id');
    console.log('   - Los clientes (CUSTOMER) ahora pueden vincularse a un restaurante (ADMIN)\n');

  } catch (error) {
    console.error('❌ Error aplicando migración:', error);
    process.exit(1);
  }
}

applyMigration();
