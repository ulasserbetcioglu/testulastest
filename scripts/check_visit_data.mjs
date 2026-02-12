import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://mlegotnkqlnkfwqblqbs.supabase.co'
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sZWdvdG5rcWxua2Z3cWJscWJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1MzgwMjgsImV4cCI6MjA2MjExNDAyOH0.x1OxCjNNwNbG4DZewODsL6LQiw8gHNvNp3WetG4zpIs'
const supabase = createClient(supabaseUrl, supabaseKey)

async function check() {
    console.log('Checking equipment_checks content...')
    const { data, error } = await supabase.from('visits').select('equipment_checks').not('equipment_checks', 'is', null).limit(3);

    if (data) {
        data.forEach((d, i) => {
            console.log(`Row ${i} equipment_checks:`, JSON.stringify(d.equipment_checks, null, 2));
        });
    } else {
        console.log('No data found for equipment_checks');
    }

    // Also checking one more potential table name 'device_monitoring' or similar
}

check()
