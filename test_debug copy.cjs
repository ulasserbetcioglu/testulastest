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
    console.log('Invoking DEBUG mode on live Edge Function...');
    try {
        const debugInfo = await postData({ type: 'debug', test: 'body_check' });
        console.log('Debug Response:', JSON.stringify(debugInfo, null, 2));
    } catch (err) {
        console.error('Debug error:', err);
    }
}

run();
