import http from 'http';

const testRoute = (path) => {
  return new Promise((resolve) => {
    const options = {
      hostname: '127.0.0.1',
      port: 5000,
      path: path,
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = JSON.parse(data);
        } catch (e) {
          // ignore parsing error for non-json
        }
        resolve({
          path,
          status: res.statusCode,
          success: res.statusCode >= 200 && res.statusCode < 300,
          data: parsed
        });
      });
    });

    req.on('error', (err) => {
      resolve({
        path,
        status: null,
        success: false,
        error: err.message
      });
    });

    req.end();
  });
};

const runAllRouteTests = async () => {
  const routesToTest = [
    '/api/products',
    '/api/categories',
    '/api/subcategories',
    '/api/tipoEstabelecimentos',
    '/api/services',
    '/api/providers',
    '/api/provinces',
    '/api/document-types',
    '/api/vehicle-types',
    '/api/catalog'
  ];

  console.log('Starting health checks for all key public API routes on http://127.0.0.1:5000...\n');
  
  let successCount = 0;
  for (const route of routesToTest) {
    const result = await testRoute(route);
    if (result.success) {
      console.log(`✅ [200 OK] ${route}`);
      successCount++;
    } else {
      console.log(`❌ [FAILED: ${result.status || result.error}] ${route}`);
    }
  }

  console.log(`\nResults: Passed ${successCount}/${routesToTest.length} routes.`);
  if (successCount === routesToTest.length) {
    console.log('All API endpoints are healthy and responding correctly!');
    process.exit(0);
  } else {
    console.log('Some API endpoints failed checks. Please verify backend logs.');
    process.exit(1);
  }
};

runAllRouteTests();
