const fs = require('fs');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

const env = dotenv.parse(fs.readFileSync('.env'));
const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function run() {
    console.log('Querying parasut_settings with service role key if possible...');
    // Since I don't have the service role key locally, I'll use the anon key.
    // But typically these tables are protected.
    const { data, error } = await supabase.from('parasut_settings').select('*');
    if (error) {
        console.error('Error:', error.message);
    } else {
        console.log('Found Settings Count:', data.length);
        if (data.length > 0) {
            console.log('Company ID:', data[0].company_id);
            console.log('Expires At:', data[0].expires_at);
        }
    }
}

run();
