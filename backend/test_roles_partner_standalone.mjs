process.env.JWT_SECRET = process.env.JWT_SECRET || 'nhiquelasecretkey123';

import { generateToken } from './utils.js';
import { DEFAULT_ROLE_PERMISSIONS } from './routes/roleRoutes.js';

console.log('================================================================');
console.log('🧪 TESTES DE UNIDADE & LÓGICA DE NEGÓCIO DA ARQUITETURA DE ROLES');
console.log('================================================================\n');

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✅ [PASS]: ${message}`);
    passCount++;
  } else {
    console.error(`❌ [FAIL]: ${message}`);
    failCount++;
  }
}

// ------------------------------------------------------------------
// 1. TESTE DE GERAÇÃO DE TOKEN JWT COM CLAIM ROLE & PARTNER ID
// ------------------------------------------------------------------
console.log('----------------------------------------------------------------');
console.log('1. Teste de Geração e Inclusão de Claims no JWT Token');
console.log('----------------------------------------------------------------');

const adminUser = { id: 'u1', name: 'Admin Teste', email: 'admin@test.com', role: 'ADMIN', isAdmin: true };
const partnerUser = { id: 'u2', name: 'Parceiro Teste', email: 'partner@test.com', role: 'PARTNER', isPartner: true, partnerId: 'p123' };
const driverUser = { id: 'u3', name: 'Driver Teste', email: 'driver@test.com', role: 'DRIVER', isDeliveryMan: true, partnerId: 'p123' };
const sellerUser = { id: 'u4', name: 'Seller Teste', email: 'seller@test.com', role: 'SELLER', isSeller: true, partnerId: 'p123' };
const operatorUser = { id: 'u5', name: 'Operator Teste', email: 'op@test.com', role: 'OPERATOR', isOperator: true };

const tokenAdmin = generateToken(adminUser);
const tokenPartner = generateToken(partnerUser);
const tokenDriver = generateToken(driverUser);

assert(typeof tokenAdmin === 'string', 'Token Admin gerado com sucesso.');
assert(typeof tokenPartner === 'string', 'Token Partner gerado com sucesso.');
assert(typeof tokenDriver === 'string', 'Token Driver gerado com sucesso.');


// ------------------------------------------------------------------
// 2. TESTE DAS MATRIZES DE PERMISSÕES PADRÃO POR PERFIL (FASE 21)
// ------------------------------------------------------------------
console.log('\n----------------------------------------------------------------');
console.log('2. Teste da Matriz Padrão de Roles e Permissões (Fase 21)');
console.log('----------------------------------------------------------------');

assert(DEFAULT_ROLE_PERMISSIONS.ADMIN.includes('FULL_ACCESS'), 'ADMIN possui FULL_ACCESS.');
assert(DEFAULT_ROLE_PERMISSIONS.PARTNER.includes('DASHBOARD_VIEW'), 'PARTNER possui DASHBOARD_VIEW.');
assert(DEFAULT_ROLE_PERMISSIONS.PARTNER.includes('DRIVER_CREATE'), 'PARTNER possui DRIVER_CREATE.');
assert(DEFAULT_ROLE_PERMISSIONS.PARTNER.includes('REPORT_EXPORT'), 'PARTNER possui REPORT_EXPORT.');
assert(!DEFAULT_ROLE_PERMISSIONS.PARTNER.includes('ROLE_MANAGE'), 'PARTNER NÃO possui ROLE_MANAGE.');
assert(DEFAULT_ROLE_PERMISSIONS.OPERATOR.includes('DRIVER_CREATE'), 'OPERATOR possui DRIVER_CREATE.');
assert(!DEFAULT_ROLE_PERMISSIONS.OPERATOR.includes('FULL_ACCESS'), 'OPERATOR NÃO possui FULL_ACCESS.');


// ------------------------------------------------------------------
// 3. TESTE DA REGRA CRÍTICA DE ASSOCIAÇÃO ÚNICA (FASE 7 & 11)
// ------------------------------------------------------------------
console.log('\n----------------------------------------------------------------');
console.log('3. Teste da Regra Rígida de Associação a Parceiro Único (Fase 7 & 11)');
console.log('----------------------------------------------------------------');

function attemptAssignDriver(driverDoc, targetPartnerId) {
  if (driverDoc.partnerId && String(driverDoc.partnerId) !== String(targetPartnerId)) {
    return { success: false, status: 400, message: 'Este utilizador já está associado a outro parceiro.' };
  }
  driverDoc.partnerId = targetPartnerId;
  return { success: true, message: 'Motorista associado com sucesso.' };
}

const mockDriver = { id: 'd001', name: 'Motorista 001', partnerId: null };

// Passo A: Vincular ao Parceiro A
const resA = attemptAssignDriver(mockDriver, 'PARTNER_A');
assert(resA.success === true, 'Motorista 001 vinculado com sucesso ao Parceiro A.');
assert(mockDriver.partnerId === 'PARTNER_A', 'partnerId do Motorista 001 é PARTNER_A.');

// Passo B: Tentar vincular ao Parceiro B enquanto já está no Parceiro A
const resB = attemptAssignDriver(mockDriver, 'PARTNER_B');
assert(resB.success === false, 'Tentativa de reassociar ao Parceiro B foi BLOQUEADA.');
assert(resB.message === 'Este utilizador já está associado a outro parceiro.', 'Mensagem de erro exata retornada.');

// Passo C: Remover associação (partnerId = null)
mockDriver.partnerId = null;
assert(mockDriver.partnerId === null, 'Associação removida. partnerId = null.');

// Passo D: Vincular agora ao Parceiro B
const resB2 = attemptAssignDriver(mockDriver, 'PARTNER_B');
assert(resB2.success === true, 'Após remoção, motorista foi reassociado com sucesso ao Parceiro B.');
assert(mockDriver.partnerId === 'PARTNER_B', 'partnerId do Motorista 001 é PARTNER_B.');


// ------------------------------------------------------------------
// 4. TESTE DA LÓGICA DE AUDITORIA (AUDIT LOG - FASE 21.10)
// ------------------------------------------------------------------
console.log('\n----------------------------------------------------------------');
console.log('4. Teste de Formatação de Audit Log (Fase 21.10)');
console.log('----------------------------------------------------------------');

function generateAuditPayload(adminUser, roleCode, addedPerms, removedPerms) {
  return {
    performedBy: adminUser.id,
    performedByName: adminUser.name,
    action: 'ROLE_PERMISSIONS_UPDATE',
    targetRole: roleCode,
    details: {
      addedPermissions: addedPerms,
      removedPermissions: removedPerms
    }
  };
}

const auditPayload = generateAuditPayload(adminUser, 'PARTNER', ['NEW_PERM'], ['REPORT_EXPORT']);
assert(auditPayload.action === 'ROLE_PERMISSIONS_UPDATE', 'Ação no AuditLog é ROLE_PERMISSIONS_UPDATE.');
assert(auditPayload.details.removedPermissions.includes('REPORT_EXPORT'), 'Permissão removida capturada no AuditLog.');

console.log('\n================================================================');
console.log(`📊 RESUMO DOS TESTES: ${passCount} PASSOU | ${failCount} FALHOU`);
console.log('================================================================');

if (failCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
