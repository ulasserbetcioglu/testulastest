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

async function createBucket() {
  try {
    console.log('\n📦 Checking if documents bucket exists...');

    // List all buckets
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();

    if (listError) {
      console.error('❌ Error listing buckets:', listError.message);
      throw listError;
    }

    console.log('   Existing buckets:', buckets.map(b => b.name).join(', '));

    // Check if documents bucket exists
    const documentsBucket = buckets.find(b => b.name === 'documents');

    if (documentsBucket) {
      console.log('✅ Documents bucket already exists!');
    } else {
      console.log('📝 Creating documents bucket...');

      const { data, error: createError } = await supabase.storage.createBucket('documents', {
        public: true,
        fileSizeLimit: 10485760, // 10MB
        allowedMimeTypes: [
          'application/pdf',
          'image/jpeg',
          'image/png',
          'image/jpg',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ]
      });

      if (createError) {
        console.error('❌ Error creating bucket:', createError.message);
        throw createError;
      }

      console.log('✅ Documents bucket created successfully!');
    }

    // Check company-assets bucket
    const companyAssetsBucket = buckets.find(b => b.name === 'company-assets');

    if (!companyAssetsBucket) {
      console.log('\n📝 Creating company-assets bucket...');

      const { error: createError } = await supabase.storage.createBucket('company-assets', {
        public: true,
        fileSizeLimit: 10485760, // 10MB
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/jpg', 'image/svg+xml']
      });

      if (createError) {
        console.log('⚠️  Could not create company-assets bucket:', createError.message);
      } else {
        console.log('✅ Company-assets bucket created successfully!');
      }
    } else {
      console.log('✅ Company-assets bucket already exists!');
    }

    console.log('\n✅ All storage buckets are ready!');
    console.log('\n📋 Next Steps:');
    console.log('   1. Dökümanları yükleyebilirsiniz');
    console.log('   2. Dökümanları görüntüleyebilir ve indirebilirsiniz');

  } catch (err) {
    console.error('❌ Failed:', err.message);
    console.log('\n📝 Please create the bucket manually:');
    console.log('   1. Go to Supabase Dashboard → Storage');
    console.log('   2. Click "New Bucket"');
    console.log('   3. Name: documents');
    console.log('   4. Public: Yes');
    console.log('   5. File size limit: 10MB');
    process.exit(1);
  }
}

createBucket();
