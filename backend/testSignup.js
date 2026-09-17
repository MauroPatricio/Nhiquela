const fetch = require('node-fetch');
(async () => {
  const response = await fetch('http://localhost:5000/api/users/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Test User',
      phoneNumber: '851234567',
      email: 'testuser@example.com',
      password: 'Test123!',
      isSeller: true,
      sellerLocation: 'Maputo',
      tipoEstabelecimento: 'Restaurant'
    })
  });
  const data = await response.json();
  console.log('Status:', response.status);
  console.log('Response:', data);
})();
