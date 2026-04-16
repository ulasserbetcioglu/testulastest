import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.join(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envLines = envContent.split('\n');

let supabaseUrl, anonKey;
for (const line of envLines) {
  if (line.startsWith('VITE_SUPABASE_URL=')) {
    supabaseUrl = line.split('=')[1].trim();
  }
  if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) {
    anonKey = line.split('=')[1].trim();
  }
}

if (!supabaseUrl || !anonKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

console.log('🔄 Connecting to Supabase...');
const supabase = createClient(supabaseUrl, anonKey);

async function applyPolicies() {
  try {
    console.log('\n📝 Applying RLS policies for documents table...');

    const sql = `
-- Drop old policy
DROP POLICY IF EXISTS "Enable customer access to own documents" ON documents;

-- Allow everyone (including local auth) to see 'public' documents
DROP POLICY IF EXISTS "Enable access to public documents" ON documents;
CREATE POLICY "Enable access to public documents"
  ON documents
  FOR SELECT
  TO public
  USING (entity_type = 'public');

-- Allow admin and operators (including local auth) to see 'internal' documents
DROP POLICY IF EXISTS "Enable access to internal documents" ON documents;
CREATE POLICY "Enable access to internal documents"
  ON documents
  FOR SELECT
  TO public
  USING (entity_type = 'internal');

-- Allow admin to insert documents
DROP POLICY IF EXISTS "Enable admin insert documents" ON documents;
CREATE POLICY "Enable admin insert documents"
  ON documents
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.email() = 'admin@ilaclamatik.com');

-- Allow admin to update documents
DROP POLICY IF EXISTS "Enable admin update documents" ON documents;
CREATE POLICY "Enable admin update documents"
  ON documents
  FOR UPDATE
  TO authenticated
  USING (auth.email() = 'admin@ilaclamatik.com');

-- Allow admin to delete documents
DROP POLICY IF EXISTS "Enable admin delete documents" ON documents;
CREATE POLICY "Enable admin delete documents"
  ON documents
  FOR DELETE
  TO authenticated
  USING (auth.email() = 'admin@ilaclamatik.com');
`;

    const { data, error } = await supabase.rpc('exec_sql', { query: sql });

    if (error) {
      throw error;
    }

    console.log('✅ RLS policies applied successfully!');
    console.log('\n📋 New Policies:');
    console.log('   ✓ Public documents: Accessible by everyone (admin, operators, customers, branches)');
    console.log('   ✓ Internal documents: Accessible by admin and operators only');
    console.log('   ✓ Admin can insert/update/delete all documents');

  } catch (err) {
    console.error('❌ Failed to apply policies:', err.message);
    console.log('\n📝 Please apply this SQL manually in Supabase SQL Editor:');
    console.log('\nFile: supabase/migrations/20251119193738_fix_document_policies.sql\n');
    process.exit(1);
  }
}

applyPolicies();
