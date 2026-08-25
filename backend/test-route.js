const http = require('http');

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/v1/admin/users/6a8ad24ef365e64afa8f4752/toggle-active',
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
  }
};

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  res.setEncoding('utf8');
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    console.log(`BODY: ${data}`);
  });
});

req.on('error', (e) => {
  console.error(`problem with request: ${e.message}`);
});

req.end();
