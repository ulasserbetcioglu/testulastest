import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function checkLogs() {
    try {
        const { data, error } = await supabase
            .from('parasut_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(3);

        if (error) {
            console.error('Error fetching logs:', error);
            return;
        }

        console.log(JSON.stringify(data, null, 2));
    } catch (e) {
        console.error('General error:', e);
    }
}

checkLogs();
