import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read .env file
const envPath = path.join(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envLines = envContent.split('\n');

let supabaseUrl, supabaseKey;
for (const line of envLines) {
  if (line.startsWith('VITE_SUPABASE_URL=')) {
    supabaseUrl = line.split('=')[1].trim();
  }
  if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) {
    supabaseKey = line.split('=')[1].trim();
  }
}

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

console.log('🔄 Connecting to Supabase...');
const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  try {
    console.log('📝 Adding password_hash column to customers table...');
    const { error: error1 } = await supabase.rpc('exec_sql', {
      query: 'ALTER TABLE customers ADD COLUMN IF NOT EXISTS password_hash text;'
    });

    console.log('📝 Adding password_hash column to branches table...');
    const { error: error2 } = await supabase.rpc('exec_sql', {
      query: 'ALTER TABLE branches ADD COLUMN IF NOT EXISTS password_hash text;'
    });

    console.log('📝 Creating indexes...');
    const { error: error3 } = await supabase.rpc('exec_sql', {
      query: `
        CREATE INDEX IF NOT EXISTS customers_email_idx ON customers(email);
        CREATE INDEX IF NOT EXISTS branches_email_idx ON branches(email);
      `
    });

    console.log('✅ Migration completed!');
    console.log('\nYou can now:');
    console.log('1. Create customers with email/password in the admin panel');
    console.log('2. Create branches with email/password in the admin panel');
    console.log('3. Customers and branches can login using the "Müşteri" and "Şube" options on the login page');

  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

applyMigration();
