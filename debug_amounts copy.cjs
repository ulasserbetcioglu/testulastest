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
            path: '/functions/v1/parasut-fetch-new',
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
    console.log('--- AMOUNTS VERIFICATION (AFTER FIX) ---');
    const contactId = "1052038995"; // 2A AKÜZÜM

    const res = await postData({
        type: 'contact_statement',
        contact_id: contactId
    });

    if (res.success && res.data && res.data.length > 0) {
        console.log(`Reconstructed ${res.data.length} transactions.`);
        console.log('Sample transaction (parsed):');
        const t = res.data[0];
        console.log(`Date: ${t.date}, Desc: ${t.description}`);
        console.log(`Debit: ${t.debit}, Credit: ${t.credit}, Balance: ${t.balance}`);
    } else {
        console.log('No data found or request failed:', res.error || res);
    }
}

run();
