import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL!;
const key = process.env.VITE_SUPABASE_ANON_KEY!;

const supabase = createClient(url, key);

async function run() {
    console.log('Checking parasut_settings...');
    const { data: settings, error } = await supabase.from('parasut_settings').select('*');
    
    if (error) {
        console.error('DB Error:', error);
    } else {
        console.log('Settings:', JSON.stringify(settings, null, 2));
    }
}

run();
