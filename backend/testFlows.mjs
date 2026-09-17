import fetch from 'node-fetch';

const baseUrl = 'http://localhost:5000';

async function post(path, body) {
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  console.log(`POST ${path} -> status ${res.status}`, data);
  return data;
}

(async () => {
  try {
    // Register client (regular user)
    await post('/api/users/signup', {
      name: 'Client User',
      phoneNumber: '850000001',
      email: 'client@example.com',
      password: 'Client123!',
      isSeller: false,
    });

    // Register seller
    await post('/api/users/signup', {
      name: 'Seller User',
      phoneNumber: '850000002',
      email: 'seller@example.com',
      password: 'Seller123!',
      isSeller: true,
      sellerLocation: 'SomeProvince',
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

    // Login driver (assuming a driver already exists with these credentials)
    await post('/api/users/signin', {
      phoneNumber: '850000003',
      password: 'Driver123!',
    });
  } catch (e) {
    console.error('Error during flow:', e);
  }
})();
