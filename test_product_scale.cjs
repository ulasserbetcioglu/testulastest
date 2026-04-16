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
    console.log('Final confirmation of v2.26 (Full Catalogue Fetch)...');
    const res = await postData({
        type: 'products',
        query: ''
    });

    if (!res.success) {
        console.error('Error:', res.error);
        return;
    }

    console.log(`Successfully fetched ${res.data?.length || 0} items from Paraşüt.`);
    console.log(`Total Pages: ${res.meta?.total_pages}`);

    // Search for "DEĞİRMEN"
    const degirmenFound = res.data?.filter(i => i.name.toLocaleLowerCase('tr-TR').includes('değirmen')) || [];
    if (degirmenFound.length > 0) {
        console.log('\nFOUND "DEĞİRMEN" products:');
        degirmenFound.forEach(i => console.log(`- ${i.name} (ID: ${i.id}, Index: ${res.data.indexOf(i)})`));
    } else {
        console.log('\n"DEĞİRMEN" not found in 1047 products.');
        if (res.data?.length > 10) {
            console.log('Sample items fetched:');
            res.data.slice(0, 5).forEach(i => console.log(`- ${i.name}`));
        }
    }
}

run();
