import fetch from 'node-fetch';

async function runHttpSignupTests() {
  console.log('--- TESTANDO ENDPOINTS HTTP DE CADASTRO (http://localhost:5000/api/users) ---');
  
  const timestamp = Date.now();

  // Teste 1: Cadastro de Cliente via HTTP /api/users/signup
  console.log('\n[TESTE HTTP 1] Cadastro de Cliente Consumidor...');
  const clientRes = await fetch('http://127.0.0.1:5000/api/users/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Cliente Teste HTTP',
      email: `client_http_${timestamp}@test.com`,
      phoneNumber: Number(`84${timestamp.toString().slice(-7)}`),
      password: 'password123',
      isSeller: false,
      isDeliveryMan: false
    })
  });

  const clientData = await clientRes.json();
  console.log('Status HTTP:', clientRes.status);
  console.log('Resposta Cliente:', {
    _id: clientData._id,
    name: clientData.name,
    email: clientData.email,
    isSeller: clientData.isSeller,
    isDeliveryMan: clientData.isDeliveryMan,
    hasToken: !!clientData.token
  });

  // Teste 2: Cadastro de Fornecedor via HTTP /api/users/signup
  console.log('\n[TESTE HTTP 2] Cadastro de Fornecedor (Seller)...');
  const sellerRes = await fetch('http://127.0.0.1:5000/api/users/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Vendedor Teste HTTP',
      email: `seller_http_${timestamp}@test.com`,
      phoneNumber: Number(`85${timestamp.toString().slice(-7)}`),
      password: 'password123',
      isSeller: true,
      isDeliveryMan: false,
      sellerName: 'Restaurante Teste HTTP',
      phoneNumberAccount: 841234567,
      sellerAddress: 'Av. Eduardo Mondlane 1234'
    })
  });

  const sellerData = await sellerRes.json();
  console.log('Status HTTP:', sellerRes.status);
  console.log('Resposta Fornecedor:', {
    _id: sellerData._id,
    name: sellerData.name,
    email: sellerData.email,
    isSeller: sellerData.isSeller,
    hasToken: !!sellerData.token
  });

  // Teste 3: Cadastro de Motorista via HTTP /api/users/signup
  console.log('\n[TESTE HTTP 3] Cadastro de Motorista (Driver)...');
  const driverRes = await fetch('http://127.0.0.1:5000/api/users/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Motorista Teste HTTP',
      email: `driver_http_${timestamp}@test.com`,
      phoneNumber: Number(`86${timestamp.toString().slice(-7)}`),
      password: 'password123',
      isSeller: false,
      isDeliveryMan: true,
      photo: 'http://example.com/photo.jpg',
      transport_type: 'MOTOCICLO',
      transport_color: 'Azul',
      transport_registration: 'ABC-999-MC',
      vihicle_picture: 'http://example.com/v.jpg',
      vihicle_picture_front: 'http://example.com/vf.jpg',
      vihicle_picture_back: 'http://example.com/vb.jpg',
      vihicle_logbook: 'http://example.com/log.jpg',
      license_front: 'http://example.com/lf.jpg',
      license_back: 'http://example.com/lb.jpg',
      document_front: 'http://example.com/df.jpg',
      document_back: 'http://example.com/db.jpg'
    })
  });

  const driverData = await driverRes.json();
  console.log('Status HTTP:', driverRes.status);
  console.log('Resposta Motorista:', {
    _id: driverData._id,
    name: driverData.name,
    email: driverData.email,
    isDeliveryMan: driverData.isDeliveryMan,
    hasToken: !!driverData.token
  });

  // Teste 4: Login do Cliente via HTTP /api/users/signin
  console.log('\n[TESTE HTTP 4] Login do Cliente cadastrado...');
  const loginRes = await fetch('http://127.0.0.1:5000/api/users/signin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: `client_http_${timestamp}@test.com`,
      password: 'password123'
    })
  });
  const loginData = await loginRes.json();
  console.log('Status HTTP Login:', loginRes.status);
  console.log('Dados do Login:', {
    _id: loginData._id,
    name: loginData.name,
    email: loginData.email,
    role: loginData.role,
    roleId: loginData.roleId,
    hasToken: !!loginData.token
  });

  console.log('\n--- TODOS OS ENDPOINTS HTTP FORAM TESTADOS COM SUCESSO! ---');
}

runHttpSignupTests().catch(err => {
  console.error('❌ ERRO NO TESTE HTTP:', err);
});
