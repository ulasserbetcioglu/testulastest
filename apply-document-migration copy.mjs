import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    console.log('\n📝 Step 1: Updating document entity types...');
    console.log('   Converting operator → internal');
    console.log('   Converting general, customer, branch → public');

    const { error: updateError1 } = await supabase
      .from('documents')
      .update({ entity_type: 'internal' })
      .eq('entity_type', 'operator');

    if (updateError1) {
      console.log('⚠️  No operator documents to update or error:', updateError1.message);
    } else {
      console.log('✅ Updated operator documents to internal');
    }

    const { error: updateError2 } = await supabase
      .from('documents')
      .update({ entity_type: 'public' })
      .in('entity_type', ['general', 'customer', 'branch']);

    if (updateError2) {
      console.log('⚠️  No general/customer/branch documents to update or error:', updateError2.message);
    } else {
      console.log('✅ Updated general/customer/branch documents to public');
    }

    console.log('\n📊 Checking document types...');
    const { data: docs, error: checkError } = await supabase
      .from('documents')
      .select('entity_type, count', { count: 'exact' });

    if (!checkError && docs) {
      const counts = {};
      docs.forEach(doc => {
        counts[doc.entity_type] = (counts[doc.entity_type] || 0) + 1;
      });
      console.log('   Document types:', counts);
    }

    console.log('\n✅ Migration completed successfully!');
    console.log('\n📋 Document Categories:');
    console.log('   - internal: Only visible to admin and operators');
    console.log('   - public: Visible to everyone (admin, operators, customers, branches)');
    console.log('\n⚠️  Note: RLS policies need to be updated manually in Supabase dashboard');
    console.log('   Migration file: supabase/migrations/20251119193738_fix_document_policies.sql');

  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

applyMigration();
