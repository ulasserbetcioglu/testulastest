const fetch = require('node-fetch');
require('dotenv').config();

const url = 'https://mlegotnkqlnkfwqblqbs.supabase.co/functions/v1/parasut-fetch';
const key = process.env.VITE_SUPABASE_ANON_KEY;

async function test() {
    console.log('Testing parasut-fetch...');
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${key}`,
                'apikey': key
            },
            body: JSON.stringify({ type: 'contacts', query: 'test' })
        });

        console.log('Status:', response.status);
        console.log('Status Text:', response.statusText);
        const data = await response.text();
        console.log('Body:', data);
    } catch (e) {
        console.error('Fetch Error:', e);
    }
}

test();
