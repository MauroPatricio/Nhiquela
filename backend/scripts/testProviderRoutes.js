import http from 'http';

const testEndpoint = (path) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: 'GET',
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: JSON.parse(data),
        });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.end();
  });
};

const runTests = async () => {
  console.log('Testing provider routes on http://localhost:5000...');
  
  try {
    // 1. Test GET /api/providers
    console.log('\n1. GET /api/providers:');
    const res1 = await testEndpoint('/api/providers');
    console.log(`Status: ${res1.status}`);
    console.log(`Count: ${res1.body.count}`);
    console.log(`Providers:`, res1.body.providers ? `${res1.body.providers.length} found` : 'none');

    // 2. Test GET /api/providers/nearby
    console.log('\n2. GET /api/providers/nearby:');
    const res2 = await testEndpoint('/api/providers/nearby?lat=-25.96&lng=32.58');
    console.log(`Status: ${res2.status}`);
    console.log(`Providers found:`, res2.body.providers ? res2.body.providers.length : 'none');

    console.log('\nAll routes responded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error during testing:', error.message);
    process.exit(1);
  }
};

runTests();
