import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log('--- Parasut Settings ---');
    const { data: settings, error: sError } = await supabase.from('parasut_settings').select('*');
    if (sError) console.error('Settings Error:', sError);
    else console.log(JSON.stringify(settings, null, 2));

    console.log('\n--- Branches (Total) ---');
    const { data: branches } = await supabase.from('branches').select('id, sube_adi, parasut_id');
    console.log(`Count: ${branches?.length || 0}`);
    console.log(JSON.stringify(branches?.slice(0, 5), null, 2));

    console.log('\n--- Paid Products (Total) ---');
    const { data: products } = await supabase.from('paid_products').select('id, name, parasut_id');
    console.log(`Count: ${products?.length || 0}`);
    console.log(JSON.stringify(products, null, 2));

    console.log('\n--- Biocidal Products (Total) ---');
    const { data: biocidal } = await supabase.from('biocidal_products').select('id, name, parasut_id');
    console.log(`Count: ${biocidal?.length || 0}`);
    console.log(JSON.stringify(biocidal, null, 2));
}

check();
