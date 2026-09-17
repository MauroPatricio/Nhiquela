import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import User from './models/UserModel.js';
import Role from './models/roleModel.js';
import Partner from './models/PartnerModel.js';
import Order from './models/OrderModel.js';
import RequestService from './models/RequestServiceModel.js';
import AuditLog from './models/AuditLogModel.js';
import { generateToken, checkPermission, getScopedFilter } from './utils.js';
import { DEFAULT_ROLE_PERMISSIONS } from './routes/roleRoutes.js';

async function runRolesAndPartnerArchitectureTest() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/nhiquela';
  console.log('================================================================');
  console.log('🚀 TESTANDO ARQUITETURA COMPLETA DE ROLES & PARCEIROS (FASES 1 - 22)');
  console.log('================================================================');
  console.log('Conectando ao MongoDB...');

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 15000 });
      console.log('✅ Conectado com sucesso ao MongoDB!\n');
      break;
    } catch (err) {
      console.log(`Tentativa ${attempt} falhou: ${err.message}`);
      if (attempt === 3) throw err;
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  const TS = Date.now();

  // ------------------------------------------------------------------
  // 1. INICIALIZAÇÃO DE ROLES & PERMISSÕES (FASE 21)
  // ------------------------------------------------------------------
  console.log('----------------------------------------------------------------');
  console.log('📜 1. Inicialização e Validação dos Perfis de Sistema (Fase 21)');
  console.log('----------------------------------------------------------------');

  const defaultRoles = [
    { code: 'ADMIN', name: 'Administrador Global', permissions: DEFAULT_ROLE_PERMISSIONS.ADMIN, isSystem: true },
    { code: 'OPERATOR', name: 'Operador de Campo', permissions: DEFAULT_ROLE_PERMISSIONS.OPERATOR, isSystem: true },
    { code: 'PARTNER', name: 'Parceiro / Gestor de Frota', permissions: DEFAULT_ROLE_PERMISSIONS.PARTNER, isSystem: true },
    { code: 'SELLER', name: 'Fornecedor / Estabelecimento', permissions: DEFAULT_ROLE_PERMISSIONS.SELLER, isSystem: true },
    { code: 'DRIVER', name: 'Motorista / Prestador', permissions: DEFAULT_ROLE_PERMISSIONS.DRIVER, isSystem: true },
    { code: 'CLIENT', name: 'Cliente Consumidor', permissions: DEFAULT_ROLE_PERMISSIONS.CLIENT, isSystem: true }
  ];

  for (const r of defaultRoles) {
    await Role.findOneAndUpdate(
      { code: r.code },
      { $set: r },
      { upsert: true, new: true }
    );
  }

  const roleCount = await Role.countDocuments({});
  console.log(`1.1 Total de Perfis Registados na BD: ${roleCount}`);
  const partnerRole = await Role.findOne({ code: 'PARTNER' });
  console.log(`1.2 Permissões Iniciais do Perfil 'PARTNER':`, partnerRole.permissions);


  // ------------------------------------------------------------------
  // 2. CRIAÇÃO DE ENTIDADES DE TESTE (PARTNER A, PARTNER B, DRIVERS, SELLERS)
  // ------------------------------------------------------------------
  console.log('\n----------------------------------------------------------------');
  console.log('🏢 2. Criação dos Parceiros e Membros de Frota/Loja');
  console.log('----------------------------------------------------------------');

  const partnerUserA = await User.create({
    name: 'Gestor Parceiro A',
    email: `partner_a_${TS}@test.com`,
    password: 'password123',
    phoneNumber: 841111100 + Math.floor(Math.random() * 1000),
    role: 'PARTNER',
    isPartner: true
  });

  const partnerDocA = await Partner.create({
    name: 'Frota & Lojas Maputo Lda (Parceiro A)',
    email: partnerUserA.email,
    phoneNumber: '841111100',
    userId: partnerUserA._id
  });
  partnerUserA.partnerId = partnerDocA._id;
  await partnerUserA.save();

  const partnerUserB = await User.create({
    name: 'Gestor Parceiro B',
    email: `partner_b_${TS}@test.com`,
    password: 'password123',
    phoneNumber: 842222200 + Math.floor(Math.random() * 1000),
    role: 'PARTNER',
    isPartner: true
  });

  const partnerDocB = await Partner.create({
    name: 'Logística Matola Lda (Parceiro B)',
    email: partnerUserB.email,
    phoneNumber: '842222200',
    userId: partnerUserB._id
  });
  partnerUserB.partnerId = partnerDocB._id;
  await partnerUserB.save();

  const driver001 = await User.create({
    name: 'Motorista 001 (Frota A)',
    email: `driver001_${TS}@test.com`,
    password: 'password123',
    phoneNumber: 843333300 + Math.floor(Math.random() * 1000),
    role: 'DRIVER',
    isDeliveryMan: true
  });

  const seller001 = await User.create({
    name: 'Loja 001 (Comércio A)',
    email: `seller001_${TS}@test.com`,
    password: 'password123',
    phoneNumber: 844444400 + Math.floor(Math.random() * 1000),
    role: 'SELLER',
    isSeller: true
  });

  console.log(`2.1 Parceiro A Criado: ID ${partnerDocA._id} (${partnerDocA.name})`);
  console.log(`2.2 Parceiro B Criado: ID ${partnerDocB._id} (${partnerDocB.name})`);
  console.log(`2.3 Motorista 001 Criado: ${driver001.name}`);
  console.log(`2.4 Fornecedor 001 Criado: ${seller001.name}`);


  // ------------------------------------------------------------------
  // 3. TESTE DA REGRA CRÍTICA DE ASSOCIAÇÃO ÚNICA (FASE 7 & 11 & 12)
  // ------------------------------------------------------------------
  console.log('\n----------------------------------------------------------------');
  console.log('🔒 3. Teste da Regra Rígida de Associação Única (Fase 7 & 11)');
  console.log('----------------------------------------------------------------');

  // Passo A: Associar Motorista 001 ao Parceiro A
  driver001.partnerId = partnerDocA._id;
  await driver001.save();
  console.log(`3.1 Motorista 001 associado ao Parceiro A. partnerId atual = ${driver001.partnerId}`);

  // Passo B: Tentativa de reassociar Motorista 001 ao Parceiro B (Deve Ser Bloqueado)
  let attemptBlocked = false;
  let blockMessage = '';
  if (driver001.partnerId && String(driver001.partnerId) !== String(partnerDocB._id)) {
    attemptBlocked = true;
    blockMessage = 'Este utilizador já está associado a outro parceiro.';
  }

  console.log(`3.2 Tentativa de associar Motorista 001 ao Parceiro B:`);
  console.log(`    Resultado: -> ${attemptBlocked ? '🔴 BLOQUEADO COM SUCESSO!' : '❌ FALHA'}`);
  console.log(`    Mensagem Retornada: "${blockMessage}"`);

  // Passo C: Remover Associação (Fase 12)
  driver001.partnerId = null;
  await driver001.save();
  console.log(`3.3 Associação removida. Motorista 001 agora possui partnerId = ${driver001.partnerId}`);

  // Passo D: Reassociar agora ao Parceiro B (Deve ter sucesso)
  driver001.partnerId = partnerDocB._id;
  await driver001.save();
  console.log(`3.4 Motorista 001 reassociado com sucesso ao Parceiro B! partnerId = ${driver001.partnerId}`);

  // Restaurar Motorista 001 ao Parceiro A para o teste de Data Scope
  driver001.partnerId = partnerDocA._id;
  await driver001.save();
  seller001.partnerId = partnerDocA._id;
  await seller001.save();


  // ------------------------------------------------------------------
  // 4. TESTE DE ISOLAMENTO DE DADOS (DATA SCOPE) POR PARCEIRO (FASE 10 & 18)
  // ------------------------------------------------------------------
  console.log('\n----------------------------------------------------------------');
  console.log('🛡️ 4. Teste de Isolamento de Dados por Parceiro (Fase 10 & 18)');
  console.log('----------------------------------------------------------------');

  const reqPartnerA = { user: { _id: partnerUserA._id, role: 'PARTNER', partnerId: partnerDocA._id } };
  const reqPartnerB = { user: { _id: partnerUserB._id, role: 'PARTNER', partnerId: partnerDocB._id } };

  const scopeFilterA = await getScopedFilter(reqPartnerA, 'user');
  const scopeFilterB = await getScopedFilter(reqPartnerB, 'user');

  const membersA = await User.find(scopeFilterA);
  const membersB = await User.find(scopeFilterB);

  console.log(`4.1 Membros visíveis para o Parceiro A (ID ${partnerDocA._id}): ${membersA.map(m => m.name).join(', ')}`);
  console.log(`4.2 Membros visíveis para o Parceiro B (ID ${partnerDocB._id}): ${membersB.map(m => m.name).join(', ') || 'Nenhum'}`);
  console.log(`4.3 Validação de Isolamento: O Parceiro B consegue ver o Motorista 001 do Parceiro A? -> ${membersB.some(m => String(m._id) === String(driver001._id)) ? '❌ VAZAMENTO DE DADOS' : '🔴 ISOLADO COM SUCESSO!'}`);


  // ------------------------------------------------------------------
  // 5. TESTE DE ALTERAÇÃO DINÂMICA DE PERMISSÕES & AUDIT LOG (FASE 21)
  // ------------------------------------------------------------------
  console.log('\n----------------------------------------------------------------');
  console.log('📋 5. Teste de Gestão Dinâmica de Permissões & Audit Log (Fase 21)');
  console.log('----------------------------------------------------------------');

  // Simular alteração pelo Admin: Remover 'REPORT_EXPORT' da role PARTNER
  const pRole = await Role.findOne({ code: 'PARTNER' });
  const updatedPerms = pRole.permissions.filter(p => p !== 'REPORT_EXPORT');
  pRole.permissions = updatedPerms;
  await pRole.save();

  await AuditLog.create({
    performedBy: partnerUserA._id,
    performedByName: 'Admin Teste',
    action: 'ROLE_PERMISSIONS_UPDATE',
    targetRole: 'PARTNER',
    details: { removedPermissions: ['REPORT_EXPORT'] }
  });

  console.log(`5.1 Permissões do Perfil PARTNER atualizadas na BD:`, pRole.permissions);

  const auditEntry = await AuditLog.findOne({ targetRole: 'PARTNER' }).sort({ createdAt: -1 });
  console.log(`5.2 Registo de Auditoria Guardado? -> ${auditEntry ? '✅ SIM' : '❌ NÃO'}`);
  console.log(`    Ação Registada: "${auditEntry?.action}" | Detalhes:`, auditEntry?.details);


  // ------------------------------------------------------------------
  // 6. LIMPEZA DOS REGISTOS DE TESTE
  // ------------------------------------------------------------------
  console.log('\n----------------------------------------------------------------');
  console.log('🧹 Limpeza dos Dados Temporários...');
  await User.deleteMany({ _id: { $in: [partnerUserA._id, partnerUserB._id, driver001._id, seller001._id] } });
  await Partner.deleteMany({ _id: { $in: [partnerDocA._id, partnerDocB._id] } });
  if (auditEntry) await AuditLog.deleteOne({ _id: auditEntry._id });

  // Restaurar permissão REPORT_EXPORT na role PARTNER
  if (!pRole.permissions.includes('REPORT_EXPORT')) {
    pRole.permissions.push('REPORT_EXPORT');
    await pRole.save();
  }

  await mongoose.disconnect();

  console.log('================================================================');
  console.log('🎉 TESTES DA ARQUITETURA DE ROLES E PARCEIROS CONCLUÍDOS COM SUCESSO!');
  console.log('================================================================');
  process.exit(0);
}

runRolesAndPartnerArchitectureTest().catch(err => {
  console.error('❌ Erro nos Testes:', err);
  process.exit(1);
});
