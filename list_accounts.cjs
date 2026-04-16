const https = require('https');
const dotenv = require('dotenv');
const fs = require('fs');

const envConfig = dotenv.parse(fs.readFileSync('.env'));
const url = envConfig.VITE_SUPABASE_URL;
const key = envConfig.VITE_SUPABASE_ANON_KEY;

const postData = (path, body) => {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(body);
        const options = {
            hostname: new URL(url).hostname,
            path: path,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${key}`,
                'apikey': key,
                'Content-Length': Buffer.byteLength(data)
            }
        };

        const req = https.request(options, (res) => {
            let resData = '';
            res.on('data', (d) => resData += d);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, body: JSON.parse(resData) });
                } catch (e) {
                    resolve({ status: res.statusCode, body: resData });
                }
            });
        });

        req.on('error', (e) => reject(e));
        req.write(data);
        req.end();
    });
};

async function run() {
    console.log(`--- FETCHING PARASUT ACCOUNTS ---`);

    const res = await postData('/functions/v1/parasut-fetch', {
        type: 'accounts'
    });

    console.log('Status Code:', res.status);
    if (res.body.success && res.body.data.length > 0) {
        console.log('--- ALL ACCOUNTS ---');
        res.body.data.forEach(acc => {
            const attr = acc.attributes || acc; // Handle both JSON:API and flat
            console.log(`[ID: ${acc.id}] Name: ${attr.name || attr.account_name || 'N/A'} | Bank: ${attr.bank_name || 'N/A'} | IBAN: ${attr.iban || 'N/A'}`);
        });
    } else {
        console.log('Response Body:', JSON.stringify(res.body, null, 2));
    }
}

run();
