import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://mlegotnkqlnkfwqblqbs.supabase.co'
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sZWdvdG5rcWxua2Z3cWJscWJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1MzgwMjgsImV4cCI6MjA2MjExNDAyOH0.x1OxCjNNwNbG4DZewODsL6LQiw8gHNvNp3WetG4zpIs'
const supabase = createClient(supabaseUrl, supabaseKey)

async function check() {
    console.log('Checking equipment data samples...')
    const { data, error } = await supabase.from('equipment').select('*').limit(5)
    if (data) console.log('Equipment samples:', data)

    // Check if there is a 'locations' or 'points' table
    const locTables = ['locations', 'points', 'sube_lokasyon', 'branch_locations', 'station_locations'];
    for (const t of locTables) {
        const { data: d, error: e } = await supabase.from(t).select('*').limit(1);
        if (!e) console.log(`Found location table: ${t}`, Object.keys(d[0] || {}));
    }
}

check()
