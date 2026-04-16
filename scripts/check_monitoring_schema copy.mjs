import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://mlegotnkqlnkfwqblqbs.supabase.co'
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sZWdvdG5rcWxua2Z3cWJscWJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1MzgwMjgsImV4cCI6MjA2MjExNDAyOH0.x1OxCjNNwNbG4DZewODsL6LQiw8gHNvNp3WetG4zpIs'
const supabase = createClient(supabaseUrl, supabaseKey)

async function check() {
    console.log('Checking tables for Rodent Monitoring...')

    const tables = ['sube_lokasyon', 'locations', 'points', 'control_points', 'visits', 'visit_details', 'check_logs'];

    for (const t of tables) {
        const { data, error } = await supabase.from(t).select('*').limit(1);
        if (!error) {
            console.log(`Found table: ${t}`);
            if (data && data.length > 0) {
                console.log(`Columns in ${t}:`, Object.keys(data[0]));
            } else {
                console.log(`Table ${t} is empty.`);
            }
        }
    }
}

check()
