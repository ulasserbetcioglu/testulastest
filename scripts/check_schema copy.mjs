
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://mlegotnkqlnkfwqblqbs.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sZWdvdG5rcWxua2Z3cWJscWJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1MzgwMjgsImV4cCI6MjA2MjExNDAyOH0.x1OxCjNNwNbG4DZewODsL6LQiw8gHNvNp3WetG4zpIs'
const supabase = createClient(supabaseUrl, supabaseKey)

async function check() {
    console.log('Fetching equipment schema...')
    const { data, error } = await supabase.from('equipment').select('*').limit(1)
    if (error) {
        console.error('Error:', error)
    } else {
        if (data && data.length > 0) {
            console.log('Columns found in equipment:', Object.keys(data[0]))
        } else {
            console.log('Equipment table empty.');
        }
    }
}

check()
