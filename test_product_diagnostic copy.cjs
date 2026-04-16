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
    console.log('Fetching initial products list (no query)...');
    const res = await postData({
        type: 'products',
        query: ''
    });

    if (!res.success) {
        console.error('Error:', res.error);
        return;
    }

    console.log(`Found ${res.data.length} items.`);
    res.data.slice(0, 10).forEach(item => {
        console.log(`- ${item.name} (Type: ${item.type}, ID: ${item.id})`);
    });

    // Search for "Zarar" with various filters
    const filters = ['filter[name]', 'filter[query]', 'filter[short_name]', 'filter[code]'];
    for (const f of filters) {
        console.log(`\nTesting search "Zarar" with ${f}...`);
        const sRes = await postData({
            type: 'products',
            query: 'Zarar',
            filter_key: f
        });
        console.log(`Results: ${sRes.data?.length || 0}`);
    }
}

run();
