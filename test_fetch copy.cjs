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
    console.log('--- DETAILED ERROR ANALYSIS ---');
    const contactId = "1052038995"; // 2A AKÜZÜM

    const res = await postData({
        type: 'contact_statement',
        contact_id: contactId
    });

    if (res.debug) {
        console.log('Sales Status:', res.debug.sales_invoices_status);
        console.log('Sales Error Body:', JSON.stringify(res.debug.sales_invoices_error, null, 2));

        console.log('\nPurchase Status:', res.debug.purchase_bills_status);
        console.log('Purchase Error Body:', JSON.stringify(res.debug.purchase_bills_error, null, 2));
    }
}

run();
