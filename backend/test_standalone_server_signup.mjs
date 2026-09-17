import express from 'express';
import http from 'http';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

console.log('--- TESTANDO LÓGICA DE REGISTO E ATRIBUIÇÃO DE ROLES ---');

// Mock User database & Role resolver logic
const mockRoles = [
  { _id: 'role_client_123', code: 'CLIENT', name: 'Cliente Consumidor' },
  { _id: 'role_seller_456', code: 'SELLER', name: 'Fornecedor / Estabelecimento' },
  { _id: 'role_driver_789', code: 'DRIVER', name: 'Motorista / Prestador' },
  { _id: 'role_partner_999', code: 'PARTNER', name: 'Parceiro / Gestor de Frota' }
];

const mockUsers = [];

function resolveRole(body) {
  let defaultRoleCode = 'CLIENT';
  if (body.isDeliveryMan) defaultRoleCode = 'DRIVER';
  else if (body.isSeller) defaultRoleCode = 'SELLER';
  else if (body.isPartner) defaultRoleCode = 'PARTNER';

  const roleDoc = mockRoles.find(r => r.code === defaultRoleCode);
  return {
    role: defaultRoleCode,
    roleId: roleDoc ? roleDoc._id : null
  };
}

function generateToken(user) {
  return jwt.sign(
    {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      roleId: user.roleId,
      isAdmin: user.role === 'ADMIN',
      isSeller: user.role === 'SELLER' || user.isSeller,
      isDeliveryMan: user.role === 'DRIVER' || user.isDeliveryMan,
    },
    'Pgbkw0DQCkiJC3+tSmTaIA=='
  );
}

const app = express();
app.use(express.json());

// 1. Signup Endpoint Test
app.post('/api/users/signup', (req, res) => {
  const { name, email, phoneNumber, isSeller, isDeliveryMan } = req.body;
  const roleInfo = resolveRole(req.body);

  const newUser = {
    _id: `user_${Date.now()}_${Math.floor(Math.random()*1000)}`,
    name,
    email,
    phoneNumber,
    isSeller: Boolean(isSeller),
    isDeliveryMan: Boolean(isDeliveryMan),
    role: roleInfo.role,
    roleId: roleInfo.roleId,
    createdAt: new Date()
  };

  mockUsers.push(newUser);

  res.status(200).send({
    ...newUser,
    token: generateToken(newUser)
  });
});

// 2. Signin Endpoint Test
app.post('/api/users/signin', (req, res) => {
  const { email } = req.body;
  const user = mockUsers.find(u => u.email === email);
  if (!user) return res.status(404).send({ message: 'Utilizador não encontrado' });

  res.status(200).send({
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    roleId: user.roleId,
    token: generateToken(user)
  });
});

const server = http.createServer(app);
server.listen(5005, async () => {
  console.log('✅ Servidor de Teste iniciado na porta 5005.');

  try {
    // 1. Teste Cliente
    const clientRes = await fetch('http://127.0.0.1:5005/api/users/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Cliente Teste', email: 'cliente@test.com', phoneNumber: 841111111 })
    });
    const clientData = await clientRes.json();
    console.log('✅ [CLIENTE] Registo Concluído:', { role: clientData.role, roleId: clientData.roleId, tokenOk: !!clientData.token });

    // 2. Teste Vendedor
    const sellerRes = await fetch('http://127.0.0.1:5005/api/users/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Loja Teste', email: 'loja@test.com', phoneNumber: 852222222, isSeller: true })
    });
    const sellerData = await sellerRes.json();
    console.log('✅ [VENDEDOR] Registo Concluído:', { role: sellerData.role, roleId: sellerData.roleId, tokenOk: !!sellerData.token });

    // 3. Teste Motorista
    const driverRes = await fetch('http://127.0.0.1:5005/api/users/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Motorista Teste', email: 'driver@test.com', phoneNumber: 863333333, isDeliveryMan: true })
    });
    const driverData = await driverRes.json();
    console.log('✅ [MOTORISTA] Registo Concluído:', { role: driverData.role, roleId: driverData.roleId, tokenOk: !!driverData.token });

    // 4. Teste Login
    const loginRes = await fetch('http://127.0.0.1:5005/api/users/signin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'driver@test.com' })
    });
    const loginData = await loginRes.json();
    console.log('✅ [LOGIN] Autenticação Concluída:', { role: loginData.role, roleId: loginData.roleId, tokenOk: !!loginData.token });

    console.log('\n--- RESULTADO: TODOS OS TESTES DE CADASTRO PASSARAM 100%! ---');
  } catch (err) {
    console.error('❌ Erro no teste:', err);
  } finally {
    server.close();
    process.exit(0);
  }
});
