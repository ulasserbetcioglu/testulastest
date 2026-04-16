import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debug() {
    console.log('--- Debugging Parasut Infrastructure ---');

    // 1. Check if parasut_settings exists and is readable
    console.log('Fetching parasut_settings...');
    const { data: settings, error: sError } = await supabase.from('parasut_settings').select('*');
    if (sError) console.error('Settings Error:', sError.message);
    else console.log('Settings Rows:', settings?.length || 0);

    // 2. Check if parasut_logs is writable
    console.log('\nTrying to insert test log...');
    const { data: logData, error: lError } = await supabase.from('parasut_logs').insert({
        level: 'test',
        message: 'Infrastructure check',
        details: { time: new Date().toISOString() }
    }).select();

    if (lError) console.error('Log Insert Error:', lError.message);
    else console.log('Log Insert Success:', logData);

    // 3. Try to fetch from a known table to verify connection
    console.log('\nFetching branches...');
    const { data: branches, error: bError } = await supabase.from('branches').select('id').limit(1);
    if (bError) console.error('Branch Error:', bError.message);
    else console.log('Connection OK, fetched branch.');
}

debug();
