const https = require('https');
const dotenv = require('dotenv');
const fs = require('fs');

const envConfig = dotenv.parse(fs.readFileSync('.env'));
const url = envConfig.VITE_SUPABASE_URL;
const key = envConfig.VITE_SUPABASE_ANON_KEY;

const postData = (body) => {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(body);
        const options = {
            hostname: new URL(url).hostname,
            path: '/functions/v1/parasut-fetch',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${key}`,
                'apikey': key,
                'Content-Length': data.length
            }
        };

        const req = https.request(options, (res) => {
            let resData = '';
            res.on('data', (d) => resData += d);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(resData));
                } catch (e) {
                    resolve(resData);
                }
            });
        });

        req.on('error', (e) => reject(e));
        req.write(data);
        req.end();
    });
};

async function run() {
    console.log('Fetching products to check meta...');
    // Our fetch function currently stripped meta, let's modify it temporarily if needed.
    // OR we can just check if page 2 has data.

    for (let p = 1; p <= 10; p++) {
        console.log(`Checking page ${p}...`);
        const res = await postData({
            type: 'products',
            query: '',
            // We need to pass page if our function supported it, but it auto-fetches 4 pages.
            // Wait, the edge function fetches 4 pages. So if 4 pages yield 15 items, it means total is 15.
        });
        console.log(`Total items found: ${res.data?.length || 0}`);
        break; // Just one check for now
    }
}

run();
