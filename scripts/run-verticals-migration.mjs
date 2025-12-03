#!/usr/bin/env node
/**
 * Run business verticals migration against Supabase
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function runMigration(filename) {
  console.log(`\n📦 Running migration: ${filename}`);
  
  const sqlPath = join(__dirname, '..', 'supabase', 'migrations', filename);
  const sql = readFileSync(sqlPath, 'utf8');
  
  // Split into individual statements (simplified - handles most cases)
  // For complex migrations, we need to handle functions specially
  const statements = [];
  let currentStatement = '';
  let inFunction = false;
  let dollarQuoteLevel = 0;
  
  const lines = sql.split('\n');
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Skip comment-only lines at the start of statements
    if (currentStatement === '' && trimmedLine.startsWith('--')) {
      continue;
    }
    
    currentStatement += line + '\n';
    
    // Track $$ for function bodies
    const dollarMatches = line.match(/\$\$/g);
    if (dollarMatches) {
      dollarQuoteLevel += dollarMatches.length;
    }
    
    // Check for CREATE FUNCTION or DO $$
    if (/CREATE\s+(OR\s+REPLACE\s+)?FUNCTION/i.test(currentStatement) || 
        /DO\s+\$\$/i.test(currentStatement)) {
      inFunction = true;
    }
    
    // Statement ends when we have $$ closed and semicolon
    if (inFunction) {
      if (dollarQuoteLevel % 2 === 0 && trimmedLine.endsWith(';')) {
        statements.push(currentStatement.trim());
        currentStatement = '';
        inFunction = false;
        dollarQuoteLevel = 0;
      }
    } else if (trimmedLine.endsWith(';') && !inFunction) {
      statements.push(currentStatement.trim());
      currentStatement = '';
    }
  }
  
  // Add any remaining statement
  if (currentStatement.trim()) {
    statements.push(currentStatement.trim());
  }
  
  console.log(`   Found ${statements.length} SQL statements`);
  
  let successCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    if (!stmt || stmt.startsWith('--')) continue;
    
    try {
      const { error } = await supabase.rpc('exec_sql', { sql_query: stmt });
      
      if (error) {
        // Try direct query for some statements
        const { error: directError } = await supabase.from('_sql').select().limit(0);
        
        // If it's a "function doesn't exist" error, try creating exec_sql
        if (error.message.includes('function') && error.message.includes('does not exist')) {
          // Execute via REST API
          const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': supabaseServiceKey,
              'Authorization': `Bearer ${supabaseServiceKey}`,
              'Prefer': 'return=minimal',
            },
            body: JSON.stringify({ sql_query: stmt }),
          });
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${await response.text()}`);
          }
        } else {
          throw error;
        }
      }
      successCount++;
      if ((i + 1) % 10 === 0) {
        process.stdout.write(`   Progress: ${i + 1}/${statements.length}\r`);
      }
    } catch (error) {
      errorCount++;
      // Only show errors that aren't "already exists" or similar
      const errorMessage = error.message || String(error);
      if (!errorMessage.includes('already exists') && 
          !errorMessage.includes('duplicate key') &&
          !errorMessage.includes('ON CONFLICT')) {
        console.error(`\n   ❌ Statement ${i + 1} failed:`, errorMessage.substring(0, 200));
      }
    }
  }
  
  console.log(`\n   ✅ Completed: ${successCount} success, ${errorCount} errors`);
}

async function main() {
  console.log('🚀 Starting Business Verticals Migration');
  console.log(`   Target: ${supabaseUrl}`);
  
  // First, let's check if tables exist
  const { data: tables, error: tablesError } = await supabase
    .from('vertical_categories')
    .select('id')
    .limit(1);
  
  if (tablesError && tablesError.code === '42P01') {
    console.log('   Tables do not exist, running full migration...');
    
    // Since we can't run raw SQL easily, let's use a different approach
    // We'll create the tables via the Supabase dashboard or via a direct SQL execution
    console.log('\n⚠️  Please run the following SQL migrations in Supabase Dashboard:');
    console.log('   1. supabase/migrations/021_business_verticals_complete.sql');
    console.log('   2. supabase/migrations/022_insert_all_verticals.sql');
    console.log('\n   Go to: Supabase Dashboard → SQL Editor → New Query → Paste & Run');
    
  } else {
    console.log('   Tables already exist, checking data...');
    
    const { count: verticalCount } = await supabase
      .from('verticals')
      .select('*', { count: 'exact', head: true });
    
    console.log(`   Found ${verticalCount || 0} verticals in database`);
  }
  
  console.log('\n✅ Migration check complete');
}

main().catch(console.error);
