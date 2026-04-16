const https = require('https');
const dotenv = require('dotenv');
const fs = require('fs');

const envConfig = dotenv.parse(fs.readFileSync('.env'));
const url = envConfig.VITE_SUPABASE_URL;
const key = envConfig.VITE_SUPABASE_ANON_KEY;

const getData = (table) => {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: new URL(url).hostname,
            path: `/rest/v1/${table}?select=*&order=created_at.desc&limit=5`,
            method: 'GET',
            headers: {
                'apikey': key,
                'Authorization': `Bearer ${key}`,
                'Content-Type': 'application/json'
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
        req.end();
    });
};

async function run() {
    console.log('Fetching latest parasut_logs...');
    try {
        const logs = await getData('parasut_logs');
        console.log('Latest Logs:', JSON.stringify(logs, null, 2));
    } catch (err) {
        console.error('Error fetching logs:', err);
    }
}

run();
