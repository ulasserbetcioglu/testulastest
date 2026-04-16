import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://mlegotnkqlnkfwqblqbs.supabase.co'
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sZWdvdG5rcWxua2Z3cWJscWJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1MzgwMjgsImV4cCI6MjA2MjExNDAyOH0.x1OxCjNNwNbG4DZewODsL6LQiw8gHNvNp3WetG4zpIs'
const supabase = createClient(supabaseUrl, supabaseKey)

async function check() {
    console.log('Fetching branches schema...')
    const { data, error } = await supabase.from('branches').select('*').limit(1)
    if (error) {
        console.error('Error:', error)
    } else {
        if (data.length > 0) {
            console.log('Columns found in branches:', Object.keys(data[0]))
        } else {
            console.log('Table is empty, cannot easily infer columns from data.');
        }
    }
}

check()
