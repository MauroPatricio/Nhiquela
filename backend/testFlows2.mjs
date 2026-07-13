import fetch from 'node-fetch';

const baseUrl = 'http://localhost:5000';

function randomEmail(prefix) {
  return `${prefix}_${Date.now()}@example.com`;
}

async function post(path, body) {
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  console.log(`POST ${path} -> status ${res.status}`, data);
  return { status: res.status, data };
}

(async () => {
  try {
    // Client signup and login
    const clientEmail = randomEmail('client');
    await post('/api/users/signup', {
      name: 'Client User',
      phoneNumber: '850100001',
      email: clientEmail,
      password: 'Client123!',
      isSeller: false,
    });
    await post('/api/users/signin', {
      phoneNumber: '850100001',
      password: 'Client123!',
    });

    // Seller signup and login (signinseller)
    const sellerEmail = randomEmail('seller');
    await post('/api/users/signup', {
      name: 'Seller User',
      phoneNumber: '850100002',
      email: sellerEmail,
      password: 'Seller123!',
      isSeller: true,
      sellerLocation: 'SomeProvince',
    });
    await post('/api/users/signinseller', {
      phoneNumber: '850100002',
      password: 'Seller123!',
    });

    // Driver creation via driver route (admin assumed, but endpoint is open for testing)
    const driverEmail = randomEmail('driver');
    await post('/api/drivers', {
      name: 'Driver User',
      email: driverEmail,
      password: 'Driver123!',
      phoneNumber: '850100003',
      transport_type: 'Bike',
      transport_color: 'Red',
      plate: 'XYZ-123',
    });
    // Driver login via generic signin
    await post('/api/users/signin', {
      phoneNumber: '850100003',
      password: 'Driver123!',
    });
  } catch (e) {
    console.error('Error during flow:', e);
  }
})();
