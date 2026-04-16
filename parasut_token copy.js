import * as https from 'https';
import * as querystring from 'querystring';

const data = querystring.stringify({
    client_id: 'Pk2zANUd0fFMIo92jeOjizr-66cFicnL2gMlpKiERXc',
    client_secret: 'LnSy-oYpQF8p9YAYsYarKMnfwsni0-jx2HBlD9eSekg',
    code: '-EzRmpLxS5mzOBJcOXP-tMnAIoSMHYcGFU8OC33DsRc',
    redirect_uri: 'urn:ietf:wg:oauth:2.0:oob',
    grant_type: 'authorization_code'
});

const options = {
    hostname: 'api.parasut.com',
    port: 443,
    path: '/oauth/token',
    method: 'POST',
    headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(data)
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

req.write(data);
req.end();
