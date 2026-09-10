import mongoose from 'mongoose';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
dotenv.config();

import User from './models/UserModel.js';
import Role from './models/roleModel.js';

async function runTests() {
  console.log('--- INICIANDO TESTES AUTOMATIZADOS DE REGISTO DE UTILIZADORES ---');
  try {
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
  } catch (err) {
    console.log('⚠️ Erro na conexão dev, tentando URI secundária...');
    await mongoose.connect('mongodb+srv://nhiquelabd:root123@nhiquela.7pafgjv.mongodb.net/?retryWrites=true&w=majority', { serverSelectionTimeoutMS: 8000 });
  }
  console.log('✅ Conexão ao MongoDB bem sucedida.');

  const timestamp = Date.now();

  // Teste 1: Registo de Cliente Consumidor
  console.log('\n[TESTE 1] Registando Cliente Consumidor...');
  const clientEmail = `test_client_${timestamp}@test.com`;
  const clientPhone = Number(`84${timestamp.toString().slice(-7)}`);

  const clientRoleDoc = await Role.findOne({ code: 'CLIENT' });
  
  const clientUser = new User({
    name: 'Cliente Teste Automático',
    email: clientEmail,
    phoneNumber: clientPhone,
    password: bcrypt.hashSync('password123', 8),
    role: 'CLIENT',
    roleId: clientRoleDoc ? clientRoleDoc._id : null,
    isSeller: false,
    isDeliveryMan: false,
    isApproved: true
  });
  await clientUser.save();

  const verifyClient = await User.findById(clientUser._id).populate('roleId');
  console.log('✅ Cliente Criado com Sucesso!');
  console.log('   - ID:', verifyClient._id);
  console.log('   - Role Code:', verifyClient.role);
  console.log('   - Role Populated:', verifyClient.roleId?.name);

  // Teste 2: Registo de Fornecedor / Estabelecimento
  console.log('\n[TESTE 2] Registando Fornecedor (Seller)...');
  const sellerEmail = `test_seller_${timestamp}@test.com`;
  const sellerPhone = Number(`85${timestamp.toString().slice(-7)}`);

  const sellerRoleDoc = await Role.findOne({ code: 'SELLER' });

  const sellerUser = new User({
    name: 'Vendedor Teste Automático',
    email: sellerEmail,
    phoneNumber: sellerPhone,
    password: bcrypt.hashSync('password123', 8),
    role: 'SELLER',
    roleId: sellerRoleDoc ? sellerRoleDoc._id : null,
    isSeller: true,
    isDeliveryMan: false,
    isApproved: true,
    seller: {
      name: 'Loja Teste Automático',
      phoneNumberAccount: 841234567,
      openstore: false
    }
  });
  await sellerUser.save();

  const verifySeller = await User.findById(sellerUser._id).populate('roleId');
  console.log('✅ Fornecedor Criado com Sucesso!');
  console.log('   - ID:', verifySeller._id);
  console.log('   - Role Code:', verifySeller.role);
  console.log('   - Role Populated:', verifySeller.roleId?.name);
  console.log('   - Loja:', verifySeller.seller?.name);

  // Teste 3: Registo de Motorista / Prestador
  console.log('\n[TESTE 3] Registando Motorista (Driver)...');
  const driverEmail = `test_driver_${timestamp}@test.com`;
  const driverPhone = Number(`86${timestamp.toString().slice(-7)}`);

  const driverRoleDoc = await Role.findOne({ code: 'DRIVER' });

  const driverUser = new User({
    name: 'Motorista Teste Automático',
    email: driverEmail,
    phoneNumber: driverPhone,
    password: bcrypt.hashSync('password123', 8),
    role: 'DRIVER',
    roleId: driverRoleDoc ? driverRoleDoc._id : null,
    isSeller: false,
    isDeliveryMan: true,
    isApproved: true,
    status: 'Disponível',
    availability: 'active',
    deliveryman: {
      photo: 'http://example.com/photo.jpg',
      name: 'Motorista Teste Automático',
      phoneNumber: driverPhone,
      transport_type: 'MOTOCICLO',
      transport_color: 'Preto',
      transport_registration: 'ABC-123-MC',
      register_conformance: 'CONFORMANCE'
    }
  });
  await driverUser.save();

  const verifyDriver = await User.findById(driverUser._id).populate('roleId');
  console.log('✅ Motorista Criado com Sucesso!');
  console.log('   - ID:', verifyDriver._id);
  console.log('   - Role Code:', verifyDriver.role);
  console.log('   - Role Populated:', verifyDriver.roleId?.name);
  console.log('   - Transporte:', verifyDriver.deliveryman?.transport_type);

  // Teste 4: Registo de Parceiro / Gestor de Frota
  console.log('\n[TESTE 4] Registando Parceiro / Gestor de Frota...');
  const partnerEmail = `test_partner_${timestamp}@test.com`;
  const partnerPhone = Number(`87${timestamp.toString().slice(-7)}`);

  const partnerRoleDoc = await Role.findOne({ code: 'PARTNER' });

  const partnerUser = new User({
    name: 'Parceiro Teste Automático',
    email: partnerEmail,
    phoneNumber: partnerPhone,
    password: bcrypt.hashSync('password123', 8),
    role: 'PARTNER',
    roleId: partnerRoleDoc ? partnerRoleDoc._id : null,
    isPartner: true,
    isApproved: true
  });
  await partnerUser.save();

  const verifyPartner = await User.findById(partnerUser._id).populate('roleId');
  console.log('✅ Parceiro Criado com Sucesso!');
  console.log('   - ID:', verifyPartner._id);
  console.log('   - Role Code:', verifyPartner.role);
  console.log('   - Role Populated:', verifyPartner.roleId?.name);

  // Limpeza dos Utilizadores de Teste
  console.log('\n[LIMPEZA] Removendo registos temporários de teste...');
  await User.deleteMany({ _id: { $in: [verifyClient._id, verifySeller._id, verifyDriver._id, verifyPartner._id] } });
  console.log('✅ Registos de teste limpos da base de dados.');

  console.log('\n--- TODOS OS TESTES PASSARAM COM SUCESSO! ---');
  process.exit(0);
}

runTests().catch(err => {
  console.error('❌ ERRO NO TESTE:', err);
  process.exit(1);
});
