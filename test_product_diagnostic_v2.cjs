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
    // 1. Exact match UpperCase
    console.log(`\nTesting search "ZARARLI MÜCADELESİ" with filter[name]...`);
    const res1 = await postData({ type: 'products', query: 'ZARARLI MÜCADELESİ', filter_key: 'filter[name]' });
    console.log(`Results: ${res1.data?.length || 0}`);

    // 2. Partial match UpperCase
    console.log(`\nTesting search "ZARAR" with filter[name]...`);
    const res2 = await postData({ type: 'products', query: 'ZARAR', filter_key: 'filter[name]' });
    console.log(`Results: ${res2.data?.length || 0}`);

    // 3. Partial match query
    console.log(`\nTesting search "ZARAR" with filter[query]...`);
    const res3 = await postData({ type: 'products', query: 'ZARAR', filter_key: 'filter[query]' });
    console.log(`Results: ${res3.data?.length || 0}`);
}

run();
