const http = require('http');

function makeRequest(data) {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify(data);

        const options = {
            hostname: 'localhost',
            port: 5000,
            path: '/get_products',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => {
                body += chunk;
            });
            res.on('end', () => {
                try {
                    resolve(JSON.parse(body));
                } catch (e) {
                    reject(e);
                }
            });
        });

        req.on('error', reject);
        req.write(postData);
        req.end();
    });
}

async function testAPI() {
    try {
        console.log('Testing Winter filter...');
        const winterResponse = await makeRequest({ season_filter: 'Winter' });

        if (winterResponse.return_code === 'SUCCESS') {
            console.log('Winter products found:', winterResponse.products.length);
        } else {
            console.log('Winter filter error:', winterResponse);
        }

        console.log('\nTesting Summer filter...');
        const summerResponse = await makeRequest({ season_filter: 'Summer' });

        if (summerResponse.return_code === 'SUCCESS') {
            console.log('Summer products found:', summerResponse.products.length);
        } else {
            console.log('Summer filter error:', summerResponse);
        }

        console.log('\nTesting no filter...');
        const allResponse = await makeRequest({});

        if (allResponse.return_code === 'SUCCESS') {
            console.log('All products found:', allResponse.products.length);
        } else {
            console.log('No filter error:', allResponse);
        }

    } catch (error) {
        console.error('API test error:', error.message);
    }
}

testAPI();
