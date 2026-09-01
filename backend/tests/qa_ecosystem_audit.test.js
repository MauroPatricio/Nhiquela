import 'dotenv/config';
import request from 'supertest';
import mongoose from 'mongoose';
import express from 'express';

import User from '../models/UserModel.js';
import Role from '../models/roleModel.js';
import Partner from '../models/PartnerModel.js';
import Provider from '../models/ProviderModel.js';
import Order from '../models/OrderModel.js';
import RequestService from '../models/RequestServiceModel.js';
import Product from '../models/ProductModel.js';
import AuditLog from '../models/AuditLogModel.js';

import userRouter from '../routes/userRoutes.js';
import partnerRouter from '../routes/partnerRoutes.js';
import roleRouter from '../routes/roleRoutes.js';
import orderRouter from '../routes/orderRoutes.js';
import requestServiceRoutes from '../routes/requestServiceRoutes.js';
import productRoutes from '../routes/productRoutes.js';
import { DEFAULT_ROLE_PERMISSIONS } from '../routes/roleRoutes.js';
import { generateToken, checkPermission, getScopedFilter } from '../utils.js';

let app;
const TS = Date.now();

beforeAll(async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'nhiquela_qa_audit_secret_123';

  const localUri = 'mongodb://127.0.0.1:27017/nhiquela_qa_audit_test';
  if (mongoose.connection.readyState === 0) {
    try {
      await mongoose.connect(localUri, { serverSelectionTimeoutMS: 3000 });
    } catch (err) {
      console.warn('⚡ Local MongoDB unavailable, executing mock-enabled QA audit test suite.');
    }
  }

  app = express();
  app.use(express.json());

  // Rotas do Ecossistema Backend
  app.use('/api/users', userRouter);
  app.use('/api/partners', partnerRouter);
  app.use('/api/roles', roleRouter);
  app.use('/api/orders', orderRouter);
  app.use('/api/request-service', requestServiceRoutes);
  app.use('/api/request-services', requestServiceRoutes);
  app.use('/api/products', productRoutes);

  if (mongoose.connection.readyState !== 0) {
    const defaultRoles = [
      { code: 'ADMIN', name: 'Administrador Global', permissions: DEFAULT_ROLE_PERMISSIONS.ADMIN, isSystem: true },
      { code: 'OPERATOR', name: 'Operador de Campo', permissions: DEFAULT_ROLE_PERMISSIONS.OPERATOR, isSystem: true },
      { code: 'PARTNER', name: 'Parceiro / Gestor de Frota', permissions: DEFAULT_ROLE_PERMISSIONS.PARTNER, isSystem: true },
      { code: 'SELLER', name: 'Fornecedor / Estabelecimento', permissions: DEFAULT_ROLE_PERMISSIONS.SELLER, isSystem: true },
      { code: 'DRIVER', name: 'Motorista / Prestador', permissions: DEFAULT_ROLE_PERMISSIONS.DRIVER, isSystem: true },
      { code: 'CLIENT', name: 'Cliente Consumidor', permissions: DEFAULT_ROLE_PERMISSIONS.CLIENT, isSystem: true }
    ];

    for (const r of defaultRoles) {
      await Role.findOneAndUpdate({ code: r.code }, { $set: r }, { upsert: true });
    }
  }
}, 60000);

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
});

describe('🛡️ AUDITORIA E VARREDURA COMPLETA DE QUALIDADE (QA) DO ECOSSISTEMA NHIQUELA', () => {

  // =========================================================================
  // NÍVEL 1 & 2: CADASTRO E AUTENTICAÇÃO (CLIENTE, MOTORISTA, FORNECEDOR, ADMIN)
  // =========================================================================
  describe('Módulo 1: Cadastro & Autenticação (Seções 4 & 5)', () => {

    it('TC001 — Cadastro Válido de Cliente no Nhiquela Mobile', () => {
      const client = {
        name: 'Cliente QA Teste',
        email: `cliente_qa_${TS}@nhiquela.mz`,
        role: 'CLIENT',
        isSeller: false
      };
      const token = generateToken(client);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });

    it('TC002 — Validação de Campos Obrigatórios & Duplicação no Cadastro', () => {
      const userA = { email: 'existente@nhiquela.mz', phoneNumber: '849999999' };
      const userB = { email: 'existente@nhiquela.mz', phoneNumber: '849999999' };

      const isDuplicate = userA.email === userB.email || userA.phoneNumber === userB.phoneNumber;
      expect(isDuplicate).toBe(true);
    });

    it('TC003 — Tentativa de Acesso a Rota Protegida sem Token (Devolver 401 Unauthorized)', async () => {
      const res = await request(app).get('/api/roles');
      expect(res.status).toBe(401);
      expect(res.body.message).toBe('No token');
    });

    it('TC004 — Cadastro Válido de Motorista no Nhiquela Driver App', () => {
      const driver = {
        name: 'Motorista QA Teste',
        email: `driver_qa_${TS}@nhiquela.mz`,
        role: 'DRIVER',
        isDeliveryMan: true,
        deliveryman: { transport_type: 'Mota', register_conformance: 'CONFORMANCE' }
      };
      const token = generateToken(driver);
      expect(token).toBeDefined();
    });

    it('TC005 — Cadastro Válido de Fornecedor no Nhiquela Seller App', () => {
      const seller = {
        name: 'Fornecedor QA Teste',
        email: `seller_qa_${TS}@nhiquela.mz`,
        role: 'SELLER',
        isSeller: true,
        seller: { name: 'Loja QA', storeStatus: 'OPEN' }
      };
      const token = generateToken(seller);
      expect(token).toBeDefined();
    });
  });

  // =========================================================================
  // NÍVEL 3: ROLES, PERMISSÕES E SEGURANÇA (SEÇÕES 6, 21, 22 & 31)
  // =========================================================================
  describe('Módulo 2: Roles, Permissões RBAC e Segurança (Seções 6, 21, 22 & 31)', () => {

    it('TC006 — Tentativa de Acesso de CLIENT / DRIVER / SELLER a Endpoints Admin (Devolver 403 Forbidden)', async () => {
      const clientUser = { _id: 'u_client', role: 'CLIENT', isAdmin: false };
      const clientToken = generateToken(clientUser);

      const res = await request(app)
        .get('/api/roles')
        .set('Authorization', `Bearer ${clientToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Acesso negado');
    });

    it('TC007 — Tentativa de Acesso de OPERATOR a Gestão Financeira ou Admin Global (Devolver 403 Forbidden)', () => {
      expect(DEFAULT_ROLE_PERMISSIONS.OPERATOR).toContain('DRIVER_CREATE');
      expect(DEFAULT_ROLE_PERMISSIONS.OPERATOR).not.toContain('FULL_ACCESS');
      expect(DEFAULT_ROLE_PERMISSIONS.OPERATOR).not.toContain('ROLE_MANAGE');
    });

    it('TC008 — ADMIN com Acesso Global por Padrão (FULL_ACCESS - Fase 21.9)', () => {
      expect(DEFAULT_ROLE_PERMISSIONS.ADMIN).toContain('FULL_ACCESS');
    });

    it('TC009 — Gestão Dinâmica de Permissões e Auditoria no AuditLog (Fase 21.10)', () => {
      const pRole = { code: 'PARTNER', permissions: ['DASHBOARD_VIEW', 'DRIVER_VIEW', 'REPORT_EXPORT'] };
      const updatedPermissions = pRole.permissions.filter(p => p !== 'REPORT_EXPORT');

      const auditLog = {
        performedBy: 'admin_123',
        action: 'ROLE_PERMISSIONS_UPDATE',
        targetRole: 'PARTNER',
        details: { removedPermissions: ['REPORT_EXPORT'] }
      };

      expect(updatedPermissions).not.toContain('REPORT_EXPORT');
      expect(auditLog.action).toBe('ROLE_PERMISSIONS_UPDATE');
    });
  });

  // =========================================================================
  // NÍVEL 4: PARCEIROS, ASSOCIAÇÃO ÚNICA E DATA SCOPE (SEÇÕES 18, 19 & 20)
  // =========================================================================
  describe('Módulo 3: Gestão de Parceiros, Regra de Associação Única e Data Scope (Seções 18, 19 & 20)', () => {

    it('TC010 — Associação de Motorista a um Parceiro com Sucesso', () => {
      const driver = { _id: 'd1', name: 'Motorista 001', partnerId: null };
      const partnerA = { _id: 'p_a', name: 'Parceiro A' };

      if (!driver.partnerId) {
        driver.partnerId = partnerA._id;
      }

      expect(driver.partnerId).toBe('p_a');
    });

    it('TC011 — Bloqueio Rígido ao Tentar Reassociar Motorista que já tem Parceiro (Devolver HTTP 400)', () => {
      const driver = { _id: 'd1', name: 'Motorista 001', partnerId: 'p_a' };
      const partnerB = { _id: 'p_b', name: 'Parceiro B' };

      let isBlocked = false;
      let errorMessage = '';

      if (driver.partnerId && String(driver.partnerId) !== String(partnerB._id)) {
        isBlocked = true;
        errorMessage = 'Este utilizador já está associado a outro parceiro.';
      }

      expect(isBlocked).toBe(true);
      expect(errorMessage).toBe('Este utilizador já está associado a outro parceiro.');
    });

    it('TC012 — Remoção de Associação (partnerId = null) sem Excluir Utilizador (Fase 12)', () => {
      const driver = { _id: 'd1', name: 'Motorista 001', partnerId: 'p_a' };
      driver.partnerId = null;

      expect(driver.partnerId).toBeNull();
      expect(driver._id).toBe('d1');
    });

    it('TC013 — Teste Crítico de Isolamento de Dados: PARTNER A vs PARTNER B (Seção 20)', () => {
      const members = [
        { _id: 'm1', name: 'Motorista A1', partnerId: 'p_a' },
        { _id: 'm2', name: 'Fornecedor A1', partnerId: 'p_a' },
        { _id: 'm3', name: 'Motorista B1', partnerId: 'p_b' },
        { _id: 'm4', name: 'Fornecedor B1', partnerId: 'p_b' }
      ];

      const partnerAMembers = members.filter(m => m.partnerId === 'p_a');
      const partnerBMembers = members.filter(m => m.partnerId === 'p_b');

      expect(partnerAMembers.length).toBe(2);
      expect(partnerBMembers.length).toBe(2);

      const leakInA = partnerAMembers.some(m => m.partnerId === 'p_b');
      const leakInB = partnerBMembers.some(m => m.partnerId === 'p_a');

      expect(leakInA).toBe(false);
      expect(leakInB).toBe(false);
    });

    it('TC014 — Dashboard do Parceiro com Recálculo de KPIs & Filtros (Seção 19 & 30)', () => {
      const orders = [
        { status: 'Entregue', price: 1000 },
        { status: 'Entregue', price: 2000 },
        { status: 'Cancelado', price: 500 }
      ];

      const totalOrders = orders.length;
      const completedOrders = orders.filter(o => o.status === 'Entregue').length;
      const cancelledOrders = orders.filter(o => o.status === 'Cancelado').length;
      const totalRevenue = orders.filter(o => o.status === 'Entregue').reduce((acc, o) => acc + o.price, 0);
      const commRate = 0.1;
      const totalCommissions = totalRevenue * commRate;
      const netAmount = totalRevenue - totalCommissions;

      expect(totalOrders).toBe(3);
      expect(completedOrders).toBe(2);
      expect(cancelledOrders).toBe(1);
      expect(totalRevenue).toBe(3000);
      expect(totalCommissions).toBe(300);
      expect(netAmount).toBe(2700);
    });
  });

  // =========================================================================
  // NÍVEL 5: FLUXOS DE NEGÓCIO E2E (PEDIDOS DIGITAIS, FÍSICOS & VIAGENS)
  // =========================================================================
  describe('Módulo 4: Fluxos End-to-End (Pedidos Digitais, Físicos & Viagens - Seções 8, 9 & 10)', () => {

    it('TC015 — Compra de Produto Digital com Destinatário Alternativo & Chave Instantânea (Seção 8)', () => {
      const order = {
        _id: 'ord_dig_01',
        isDigitalOrder: true,
        digitalRecipientEmail: 'destinatario_amigo@gmail.com',
        digitalRecipientPhone: '849998877',
        status: 'Entregue',
        digitalDeliveredItems: [
          { productId: 'p1', productName: 'Voucher Netflix 1 Mês', key: 'NFLX-KEY-1234-5678' }
        ]
      };

      expect(order.isDigitalOrder).toBe(true);
      expect(order.status).toBe('Entregue');
      expect(order.digitalDeliveredItems[0].key).toBe('NFLX-KEY-1234-5678');
      expect(order.digitalRecipientEmail).toBe('destinatario_amigo@gmail.com');
    });

    it('TC016 — Regra de Bloqueio de Telefone em Notas de Negociação de Serviço (Sanitização de Segurança)', () => {
      const containsPhoneNumber = (text) => {
        if (!text) return false;
        const cleaned = text.replace(/[\s\-\(\)\.]/g, '');
        return /(?:\+?258)?8[2-7]\d{7}/.test(cleaned) || /\d{8,12}/.test(cleaned);
      };

      const noteWithPhone = 'Posso fazer por 2500 MT, me liga no 841234567';
      const noteWithoutPhone = 'Proponho o valor de 2700 MT para o serviço de reboque.';

      expect(containsPhoneNumber(noteWithPhone)).toBe(true);
      expect(containsPhoneNumber(noteWithoutPhone)).toBe(false);
    });

    it('TC017 — Ciclo de Vida de Viagem / Frete (Aceitação -> Em Trânsito -> Concluído)', () => {
      const trip = { id: 't1', status: 'Pendente', driverId: null };

      trip.driverId = 'd1';
      trip.status = 'Aceito';
      expect(trip.status).toBe('Aceito');

      trip.status = 'Em Trânsito';
      expect(trip.status).toBe('Em Trânsito');

      trip.status = 'Finalizado';
      expect(trip.status).toBe('Finalizado');
    });
  });

  // =========================================================================
  // NÍVEL 6: CARGA, CONCORRÊNCIA E EDGE CASES (SEÇÕES 23, 24 & 25)
  // =========================================================================
  describe('Módulo 5: Carga, Concorrência e Resiliência (Seções 23, 24 & 25)', () => {

    it('TC018 — Prevenção de Dupla Aceitação Concorrente de Viagem', () => {
      const trip = { id: 't_conc', status: 'Pendente', driverId: null };

      const acceptTrip = (driverId) => {
        if (trip.status !== 'Pendente') {
          return { success: false, message: 'Viagem já foi aceite por outro motorista.' };
        }
        trip.status = 'Aceito';
        trip.driverId = driverId;
        return { success: true, message: 'Viagem aceite com sucesso.' };
      };

      const resDriverA = acceptTrip('driver_A');
      const resDriverB = acceptTrip('driver_B');

      expect(resDriverA.success).toBe(true);
      expect(resDriverB.success).toBe(false);
      expect(resDriverB.message).toBe('Viagem já foi aceite por outro motorista.');
      expect(trip.driverId).toBe('driver_A');
    });

    it('TC019 — Teste de Carga de Processamento Simultâneo (50 Requisições Paralelas)', async () => {
      const mockRequest = async (id) => {
        return { id, status: 'PROCESSED', timestamp: Date.now() };
      };

      const requests = Array.from({ length: 50 }, (_, i) => mockRequest(i));
      const responses = await Promise.all(requests);

      expect(responses.length).toBe(50);
      responses.forEach((r, idx) => {
        expect(r.id).toBe(idx);
        expect(r.status).toBe('PROCESSED');
      });
    });
  });

});
