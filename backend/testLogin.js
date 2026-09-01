import fetch from 'node-fetch';

const apiBase = 'http://localhost:5000/api/users';

async function signup(user) {
  const res = await fetch(`${apiBase}/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(user),
  });
  const data = await res.json();
  console.log('Signup', user.email, 'status', res.status, 'response', data);
  return data;
}

async function signin(credentials) {
  const res = await fetch(`${apiBase}/signin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });
  const data = await res.json();
  console.log('Signin', credentials.email || credentials.phoneNumber, 'status', res.status, 'response', data);
  return data;
}

(async () => {
  // Seller
  await signup({
    name: 'Seller User',
    phoneNumber: '851111111',
    email: 'seller@example.com',
    password: 'Seller123!',
    isSeller: true,
    sellerLocation: 'Maputo',
    tipoEstabelecimento: 'Restaurant',
  });
  await signin({ email: 'seller@example.com', password: 'Seller123!' });

  // Driver (delivery man)
  await signup({
    name: 'Driver User',
    phoneNumber: '851222222',
    email: 'driver@example.com',
    password: 'Driver123!',
    isDeliveryMan: true,
  });
  await signin({ email: 'driver@example.com', password: 'Driver123!' });

  // Client (regular shopper)
  await signup({
    name: 'Client User',
    phoneNumber: '851333333',
    email: 'client@example.com',
    password: 'Client123!',
  });
  await signin({ email: 'client@example.com', password: 'Client123!' });
})();
