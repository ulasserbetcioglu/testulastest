import * as https from 'https';

const token = 'ra0HYKsqkCVysUU1yEnbN1OV6CNGaaSpKKBnpZT9kfc';

const options = {
    hostname: 'api.parasut.com',
    port: 443,
    path: '/v4/me',
    method: 'GET',
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    }
};

const req = https.request(options, (res) => {
    let body = '';
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => {
        console.log(body);
        process.exit(0);
    });
});

req.on('error', (e) => {
    console.error(e);
    process.exit(1);
});

req.end();
