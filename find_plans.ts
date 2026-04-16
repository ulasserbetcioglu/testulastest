import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Try to find .env file
const envPath = path.resolve(process.cwd(), '.env');
if (!fs.existsSync(envPath)) {
    console.error('.env file not found');
    process.exit(1);
}

dotenv.config({ path: envPath });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase credentials not found in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function findPlans() {
    const { data, error } = await supabase
        .from('branch_floor_plans')
        .select('branch_id, title')
        .limit(5);

    if (error) {
        console.error('Error fetching plans:', error);
    } else {
        console.log('Branches with floor plans:', JSON.stringify(data, null, 2));
    }
}

findPlans();
