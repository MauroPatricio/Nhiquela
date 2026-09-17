const fetch = require('node-fetch');

const baseUrl = 'http://localhost:5000';

async function post(path, body) {
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  console.log(`POST ${path} -> status ${res.status}`, data);
  return data;
}

async function get(path) {
  const res = await fetch(`${baseUrl}${path}`);
  const data = await res.json();
  console.log(`GET ${path} -> status ${res.status}`, data);
  return data;
}

(async () => {
  try {
    // Register client (regular user)
    const client = await post('/api/users/signup', {
      name: 'Client User',
      phoneNumber: '850000001',
      email: 'client@example.com',
      password: 'Client123!',
      isSeller: false,
    });

    // Register seller
    const seller = await post('/api/users/signup', {
      name: 'Seller User',
      phoneNumber: '850000002',
      email: 'seller@example.com',
      password: 'Seller123!',
      isSeller: true,
      sellerLocation: 'SomeProvince', // optional, may be ignored if not a valid ID
    });

    // Register driver via driver route (admin assumed, but endpoint is open for testing)
    const driver = await post('/api/drivers', {
      name: 'Driver User',
      email: 'driver@example.com',
      password: 'Driver123!',
      phoneNumber: '850000003',
      transport_type: 'Bike',
      transport_color: 'Red',
      plate: 'XYZ-123',
    });

    // Login client
    await post('/api/users/signin', {
      phoneNumber: '850000001',
      password: 'Client123!',
    });

    // Login seller (signinseller endpoint)
    await post('/api/users/signinseller', {
      phoneNumber: '850000002',
      password: 'Seller123!',
    });

    // Login driver (generic signin works)
    await post('/api/users/signin', {
      phoneNumber: '850000003',
      password: 'Driver123!',
    });
  } catch (e) {
    console.error('Error during flow:', e);
  }
})();
