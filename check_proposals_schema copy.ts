import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    const { data, error } = await supabase
        .from('proposals')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error fetching proposals:', error);
        return;
    }

    console.log('Proposal sample:', data[0]);
    console.log('Columns:', Object.keys(data[0] || {}));
}

checkSchema();
