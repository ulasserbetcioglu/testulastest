import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkFunctions() {
    console.log('Checking parasut-fetch...');
    try {
        const { data, error } = await supabase.functions.invoke('parasut-fetch', {
            body: { type: 'contacts', query: 'test' }
        });
        if (error) console.error('parasut-fetch Error:', error);
        else console.log('parasut-fetch Success:', data);
    } catch (e) {
        console.error('parasut-fetch Exception:', e);
    }

    console.log('\nChecking parasut-automation...');
    try {
        const { data, error } = await supabase.functions.invoke('parasut-automation', {
            body: {} // Just to see if it's there
        });
        if (error) console.error('parasut-automation Error:', error);
        else console.log('parasut-automation Success:', data);
    } catch (e) {
        console.error('parasut-automation Exception:', e);
    }
}

checkFunctions();
