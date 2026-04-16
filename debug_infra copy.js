const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debug() {
    console.log('--- Debugging Parasut Infrastructure ---');

    // 1. Check if parasut_settings exists and is readable
    console.log('Fetching parasut_settings...');
    const { data: settings, error: sError } = await supabase.from('parasut_settings').select('*');
    if (sError) console.error('Settings Error:', sError.message, sError.details);
    else console.log('Settings Rows:', settings.length);

    // 2. Check if parasut_logs is writable
    console.log('\nTrying to insert test log...');
    const { data: logData, error: lError } = await supabase.from('parasut_logs').insert({
        level: 'test',
        message: 'Infrastructure check',
        details: { time: new Date().toISOString() }
    }).select();

    if (lError) console.error('Log Insert Error:', lError.message, lError.details);
    else console.log('Log Insert Success:', logData);

    // 3. Try a simple count
    console.log('\nCounting branches...');
    const { count, error: cError } = await supabase.from('branches').select('*', { count: 'exact', head: true });
    if (cError) console.error('Branch Count Error:', cError.message);
    else console.log('Total Branches:', count);
}

debug();
