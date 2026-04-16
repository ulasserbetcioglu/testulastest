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

async function testSearch(query, filterKey) {
    console.log(`\nTesting search: "${query}" with ${filterKey}...`);
    const res = await postData({
        type: 'products',
        query: query,
        filter_key: filterKey
    });

    if (!res.success) {
        console.error('Error:', res.error);
        return;
    }

    console.log(`Found ${res.data.length} results.`);
    res.data.forEach(item => {
        console.log(`- ${item.name} (Code: ${item.code}, ID: ${item.id})`);
    });
}

async function run() {
    // 1. Try with filter[name]
    await testSearch('Zararlı', 'filter[name]');

    // 2. Try with filter[query]
    await testSearch('Zararlı', 'filter[query]');

    // 3. Try with partial 'Zarar'
    await testSearch('Zarar', 'filter[name]');
    await testSearch('Zarar', 'filter[query]');
}

run();
