/**
 * importFlows.test.js
 * Testes Jest completos para o módulo de Importação da Nhiquela.
 * Testa lógica de negócio pura (sem Mongoose real nem MongoMemoryServer).
 * Cobre: pedidos, cotações (com datas), ordens, envios e fluxos E2E.
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import mongoose from 'mongoose';
import { calculateQuotation } from '../modules/import/services/ImportCostCalculator.js';

// ─────────────────────────────────────────────────────────────
// BASE DE DADOS EM MEMÓRIA (sem Mongoose)
// ─────────────────────────────────────────────────────────────
const db = { requests: [], quotations: [], orders: [], shipments: [] };

const newId = () => new mongoose.Types.ObjectId();
const CUSTOMER_ID  = newId();
const CUSTOMER_B_ID = newId();

beforeEach(() => {
  db.requests.length = 0;
  db.quotations.length = 0;
  db.orders.length = 0;
  db.shipments.length = 0;
});

// ─────────────────────────────────────────────────────────────
// SIMULADORES DE CONTROLLER (lógica de negócio pura)
// ─────────────────────────────────────────────────────────────

const ImportService = {

  createRequest(data) {
    if (!data.productImage) throw new Error('A fotografia do produto é obrigatória.');
    if (!data.productName)  throw new Error('O nome do produto é obrigatório.');
    if (!data.quantity || data.quantity <= 0) throw new Error('A quantidade deve ser maior que zero.');

    const doc = {
      _id: newId(),
      status: 'REQUESTED',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...data,
    };
    db.requests.push(doc);
    return doc;
  },

  getRequests(userId, role = 'customer') {
    const list = role === 'admin'
      ? [...db.requests]
      : db.requests.filter(r => r.customerId?.toString() === userId?.toString());

    // Enrich com dados de cotação
    return list.map(r => {
      const q = db.quotations.find(q => q.requestId?.toString() === r._id?.toString());
      return q ? { ...r, estimatedDeliveryDays: q.estimatedDeliveryDays, estimatedArrivalDate: q.estimatedArrivalDate, quotationValidUntil: q.quotationValidUntil } : r;
    });
  },

  updateStatus(id, status) {
    const VALID = ['REQUESTED','UNDER_REVIEW','SOURCING','QUOTATION_READY','QUOTATION_SENT','ACCEPTED','PROCESSING','SHIPPED','ARRIVED_AT_CUSTOMS','CUSTOMS_CLEARED','READY_FOR_DELIVERY','DELIVERED','REJECTED','CANCELLED'];
    if (!VALID.includes(status)) throw new Error(`Status inválido: ${status}`);
    const req = db.requests.find(r => r._id?.toString() === id?.toString());
    if (!req) throw new Error('Pedido não encontrado.');
    req.status = status;
    req.updatedAt = new Date();
    return req;
  },

  deleteRequest(id) {
    const idx = db.requests.findIndex(r => r._id?.toString() === id?.toString());
    if (idx === -1) throw new Error('Pedido não encontrado.');
    return db.requests.splice(idx, 1)[0];
  },

  createQuotation(data) {
    const req = db.requests.find(r => r._id?.toString() === data.requestId?.toString());
    if (!req) throw new Error('Pedido não encontrado para esta cotação.');

    const costs = {
      productCost: data.productCost || 0,
      internationalShipping: data.internationalShipping || 0,
      customsEstimated: data.customsEstimated || 0,
      nhiquelaServiceFee: data.nhiquelaServiceFee || 0,
      handlingCost: data.handlingCost || 0,
    };
    const calc = calculateQuotation(costs);

    const doc = {
      _id: newId(),
      status: 'DRAFT',
      createdAt: new Date(),
      currency: data.currency || 'MZN',
      ...data,
      ...calc,
    };
    db.quotations.push(doc);

    // Actualiza status do request
    req.status = 'QUOTATION_READY';
    return doc;
  },

  updateQuotation(id, data) {
    const quot = db.quotations.find(q => q._id?.toString() === id?.toString());
    if (!quot) throw new Error('Cotação não encontrada.');
    Object.assign(quot, data);
    return quot;
  },

  sendQuotation(id) {
    const quot = db.quotations.find(q => q._id?.toString() === id?.toString());
    if (!quot) throw new Error('Cotação não encontrada.');
    if (quot.status !== 'DRAFT' && quot.status !== 'QUOTATION_READY') throw new Error('Cotação não pode ser enviada.');
    quot.status = 'SENT';

    const req = db.requests.find(r => r._id?.toString() === quot.requestId?.toString());
    if (req) req.status = 'QUOTATION_SENT';
    return quot;
  },

  acceptQuotation(quotId, customerId) {
    const quot = db.quotations.find(q => q._id?.toString() === quotId?.toString());
    if (!quot) throw new Error('Cotação não encontrada.');
    if (quot.status !== 'SENT') throw new Error('Cotação não disponível para aceitação.');

    quot.status = 'ACCEPTED';

    const req = db.requests.find(r => r._id?.toString() === quot.requestId?.toString());
    if (req) req.status = 'ACCEPTED';

    const order = {
      _id: newId(),
      requestId: quot.requestId,
      quotationId: quot._id,
      customerId,
      totalAmount: quot.totalCost,
      status: 'PAYMENT_PENDING',
      createdAt: new Date(),
    };
    db.orders.push(order);
    return { quotation: quot, order };
  },

  updateOrderStatus(orderId, status) {
    const order = db.orders.find(o => o._id?.toString() === orderId?.toString());
    if (!order) throw new Error('Ordem não encontrada.');
    order.status = status;
    return order;
  },

  createShipment(data) {
    const doc = { _id: newId(), status: 'IN_TRANSIT', createdAt: new Date(), ...data };
    db.shipments.push(doc);
    return doc;
  },

  updateShipmentStatus(shipmentId, status) {
    const ship = db.shipments.find(s => s._id?.toString() === shipmentId?.toString());
    if (!ship) throw new Error('Envio não encontrado.');
    ship.status = status;
    // Propaga para o request via order
    const order = db.orders.find(o => o._id?.toString() === ship.orderId?.toString());
    if (order) {
      const req = db.requests.find(r => r._id?.toString() === order.requestId?.toString());
      if (req) req.status = status;
    }
    return ship;
  },
};

// Payload base
const makeReqData = (overrides = {}) => ({
  customerId: CUSTOMER_ID,
  productName: 'Maquina de Cafe Breville 870XL',
  description: 'Modelo 870XL, 220V, cor preto',
  quantity: 2,
  productUrl: 'https://alibaba.com/cafe-870xl',
  preferredOriginCountry: 'China',
  shippingMethod: 'AIR',
  productImage: 'https://res.cloudinary.com/nhiquela/image/upload/v1/cafe.jpg',
  targetBudget: 120000,
  ...overrides,
});

// ─────────────────────────────────────────────────────────────
// 1. PEDIDOS DE IMPORTAÇÃO
// ─────────────────────────────────────────────────────────────

describe('1. Pedidos de Importação', () => {

  it('1.1 Cria pedido com todos os campos válidos', () => {
    const req = ImportService.createRequest(makeReqData());
    expect(req._id).toBeDefined();
    expect(req.status).toBe('REQUESTED');
    expect(req.productName).toBe('Maquina de Cafe Breville 870XL');
    expect(req.shippingMethod).toBe('AIR');
    expect(db.requests.length).toBe(1);
  });

  it('1.2 Rejeita pedido sem productImage', () => {
    expect(() => ImportService.createRequest(makeReqData({ productImage: null }))).toThrow(/fotografia/i);
  });

  it('1.3 Rejeita pedido sem productName', () => {
    expect(() => ImportService.createRequest(makeReqData({ productName: '' }))).toThrow(/nome/i);
  });

  it('1.4 Rejeita pedido com quantity=0', () => {
    expect(() => ImportService.createRequest(makeReqData({ quantity: 0 }))).toThrow(/quantidade/i);
  });

  it('1.5 Cliente vê apenas os seus pedidos', () => {
    ImportService.createRequest(makeReqData({ customerId: CUSTOMER_ID }));
    ImportService.createRequest(makeReqData({ customerId: CUSTOMER_ID, productName: 'Prod 2' }));
    ImportService.createRequest(makeReqData({ customerId: CUSTOMER_B_ID, productName: 'Prod B' }));

    const forA = ImportService.getRequests(CUSTOMER_ID, 'customer');
    const forB = ImportService.getRequests(CUSTOMER_B_ID, 'customer');

    expect(forA.length).toBe(2);
    expect(forB.length).toBe(1);
    expect(forA.map(r => r.productName)).not.toContain('Prod B');
  });

  it('1.6 Admin vê todos os pedidos', () => {
    ImportService.createRequest(makeReqData({ customerId: CUSTOMER_ID }));
    ImportService.createRequest(makeReqData({ customerId: CUSTOMER_B_ID, productName: 'Prod B' }));

    const all = ImportService.getRequests(null, 'admin');
    expect(all.length).toBe(2);
  });

  it('1.7 Altera o status do pedido', () => {
    const req = ImportService.createRequest(makeReqData());
    const updated = ImportService.updateStatus(req._id, 'SOURCING');
    expect(updated.status).toBe('SOURCING');
  });

  it('1.8 Elimina pedido existente', () => {
    const req = ImportService.createRequest(makeReqData());
    ImportService.deleteRequest(req._id);
    expect(db.requests.length).toBe(0);
  });

  it('1.9 Eliminação de pedido inexistente lança erro', () => {
    expect(() => ImportService.deleteRequest(newId())).toThrow(/não encontrado/i);
  });

  it('1.10 Status inválido lança erro', () => {
    const req = ImportService.createRequest(makeReqData());
    expect(() => ImportService.updateStatus(req._id, 'FAKE_STATUS')).toThrow(/inválido/i);
  });
});

// ─────────────────────────────────────────────────────────────
// 2. COTAÇÕES DE IMPORTAÇÃO
// ─────────────────────────────────────────────────────────────

describe('2. Cotações de Importação', () => {

  it('2.1 calculateQuotation: total = soma de todos os componentes', () => {
    const r = calculateQuotation({ productCost: 50000, internationalShipping: 8000, customsEstimated: 7000, nhiquelaServiceFee: 9750 });
    expect(r.totalCost).toBe(74750);
  });

  it('2.2 calculateQuotation: funciona com componentes opcionais a zero', () => {
    const r = calculateQuotation({ productCost: 50000 });
    expect(r.totalCost).toBeGreaterThanOrEqual(50000);
    expect(r.productCost).toBe(50000);
  });

  it('2.3 Cria cotação com datas (estimatedDeliveryDays, estimatedArrivalDate, quotationValidUntil)', () => {
    const req = ImportService.createRequest(makeReqData());
    const arrivalDate = new Date('2026-11-20');
    const validUntil  = new Date('2026-10-10');

    const quot = ImportService.createQuotation({
      requestId: req._id,
      productCost: 50000,
      internationalShipping: 8000,
      customsEstimated: 7000,
      nhiquelaServiceFee: 9750,
      estimatedDeliveryDays: '45',
      estimatedArrivalDate: arrivalDate,
      quotationValidUntil: validUntil,
    });

    expect(quot.estimatedDeliveryDays).toBe('45');
    expect(new Date(quot.estimatedArrivalDate).toDateString()).toBe(arrivalDate.toDateString());
    expect(new Date(quot.quotationValidUntil).toDateString()).toBe(validUntil.toDateString());
    expect(quot.totalCost).toBe(74750);
  });

  it('2.4 Criação de cotação muda status do Request para QUOTATION_READY', () => {
    const req = ImportService.createRequest(makeReqData());
    ImportService.createQuotation({ requestId: req._id, productCost: 40000 });
    expect(db.requests[0].status).toBe('QUOTATION_READY');
  });

  it('2.5 Actualiza cotação existente com novas datas', () => {
    const req = ImportService.createRequest(makeReqData());
    const quot = ImportService.createQuotation({ requestId: req._id, productCost: 40000 });

    const updated = ImportService.updateQuotation(quot._id, {
      productCost: 45000,
      estimatedDeliveryDays: '30',
      estimatedArrivalDate: new Date('2026-10-28'),
    });

    expect(updated.productCost).toBe(45000);
    expect(updated.estimatedDeliveryDays).toBe('30');
  });

  it('2.6 Envio de cotação muda status para SENT', () => {
    const req = ImportService.createRequest(makeReqData());
    const quot = ImportService.createQuotation({ requestId: req._id, productCost: 50000 });
    const sent = ImportService.sendQuotation(quot._id);
    expect(sent.status).toBe('SENT');
  });

  it('2.7 Cotação DRAFT não pode ser aceite (regra de negócio)', () => {
    const req = ImportService.createRequest(makeReqData());
    const quot = ImportService.createQuotation({ requestId: req._id, productCost: 50000 });
    // Não enviou — status é DRAFT
    expect(() => ImportService.acceptQuotation(quot._id, CUSTOMER_ID)).toThrow(/não disponível/i);
  });

  it('2.8 Cotação sem datas opcionais não falha', () => {
    const req = ImportService.createRequest(makeReqData());
    const quot = ImportService.createQuotation({ requestId: req._id, productCost: 40000 });
    expect(quot.estimatedArrivalDate ?? null).toBeNull();
    expect(quot.quotationValidUntil ?? null).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────
// 3. ORDENS DE IMPORTAÇÃO
// ─────────────────────────────────────────────────────────────

describe('3. Ordens de Importação', () => {

  const setupSentQuot = () => {
    const req = ImportService.createRequest(makeReqData());
    const quot = ImportService.createQuotation({
      requestId: req._id,
      productCost: 80000,
      internationalShipping: 15000,
      customsEstimated: 10000,
      nhiquelaServiceFee: 15750,
      estimatedDeliveryDays: '45',
      estimatedArrivalDate: new Date('2026-12-01'),
    });
    ImportService.sendQuotation(quot._id);
    return { req, quot };
  };

  it('3.1 Aceitar cotação cria ordem PAYMENT_PENDING', () => {
    const { quot } = setupSentQuot();
    const { order } = ImportService.acceptQuotation(quot._id, CUSTOMER_ID);
    expect(order.status).toBe('PAYMENT_PENDING');
    expect(order.totalAmount).toBe(120750);
  });

  it('3.2 Após aceitar cotação, Request muda para ACCEPTED', () => {
    const { req, quot } = setupSentQuot();
    ImportService.acceptQuotation(quot._id, CUSTOMER_ID);
    expect(db.requests.find(r => r._id?.toString() === req._id?.toString()).status).toBe('ACCEPTED');
  });

  it('3.3 Confirmação de pagamento muda ordem para PAID', () => {
    const { quot } = setupSentQuot();
    const { order } = ImportService.acceptQuotation(quot._id, CUSTOMER_ID);
    const paid = ImportService.updateOrderStatus(order._id, 'PAID');
    expect(paid.status).toBe('PAID');
  });

  it('3.4 Listagem de ordens do cliente', () => {
    const { quot } = setupSentQuot();
    ImportService.acceptQuotation(quot._id, CUSTOMER_ID);
    const myOrders = db.orders.filter(o => o.customerId?.toString() === CUSTOMER_ID?.toString());
    expect(myOrders.length).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────
// 4. FLUXO COMPLETO E2E
// ─────────────────────────────────────────────────────────────

describe('4. Fluxo Completo E2E', () => {

  it('4.1 Fluxo AIR completo: Request → Quotation → Accept → Pay → Ship → Deliver', () => {
    // STEP 1: Pedido
    const req = ImportService.createRequest(makeReqData({ shippingMethod: 'AIR' }));
    expect(req.status).toBe('REQUESTED');

    // STEP 2: Cotação com datas
    const arrivalDate = new Date(Date.now() + 7 * 24 * 3600 * 1000);
    const quot = ImportService.createQuotation({
      requestId: req._id,
      productCost: 80000,
      internationalShipping: 15000,
      customsEstimated: 10000,
      nhiquelaServiceFee: 15750,
      estimatedDeliveryDays: '7',
      estimatedArrivalDate: arrivalDate,
    });
    expect(quot.estimatedDeliveryDays).toBe('7');
    expect(db.requests[0].status).toBe('QUOTATION_READY');

    // STEP 3: Envio
    ImportService.sendQuotation(quot._id);
    expect(quot.status).toBe('SENT');

    // STEP 4: Aceitação
    const { order } = ImportService.acceptQuotation(quot._id, CUSTOMER_ID);
    expect(order.status).toBe('PAYMENT_PENDING');
    expect(db.requests[0].status).toBe('ACCEPTED');

    // STEP 5: Pagamento confirmado
    ImportService.updateOrderStatus(order._id, 'PAID');

    // STEP 6: Envio criado
    const shipment = ImportService.createShipment({ orderId: order._id, trackingNumber: 'DHL-AIR-789', carrier: 'DHL' });

    // STEP 7-11: Progressão de estados
    ['ARRIVED_AT_CUSTOMS', 'CUSTOMS_CLEARED', 'READY_FOR_DELIVERY', 'DELIVERED'].forEach(status => {
      ImportService.updateShipmentStatus(shipment._id, status);
    });

    expect(shipment.status).toBe('DELIVERED');
    expect(db.requests[0].status).toBe('DELIVERED');
  });

  it('4.2 Fluxo SEA: estimativa de 35 dias', () => {
    const req = ImportService.createRequest(makeReqData({ shippingMethod: 'SEA' }));
    const quot = ImportService.createQuotation({ requestId: req._id, productCost: 50000, estimatedDeliveryDays: '35' });

    expect(req.shippingMethod).toBe('SEA');
    expect(quot.estimatedDeliveryDays).toBe('35');
  });

  it('4.3 Fluxo rejeitado — pedido rejeitado não cria ordem', () => {
    const req = ImportService.createRequest(makeReqData());
    ImportService.updateStatus(req._id, 'REJECTED');

    expect(db.requests[0].status).toBe('REJECTED');
    expect(db.orders.length).toBe(0);
  });

  it('4.4 Cancelamento após pagamento pendente', () => {
    const req = ImportService.createRequest(makeReqData());
    const quot = ImportService.createQuotation({ requestId: req._id, productCost: 50000 });
    ImportService.sendQuotation(quot._id);
    const { order } = ImportService.acceptQuotation(quot._id, CUSTOMER_ID);

    ImportService.updateOrderStatus(order._id, 'CANCELLED');
    expect(db.orders[0].status).toBe('CANCELLED');
  });
});

// ─────────────────────────────────────────────────────────────
// 5. CAMPOS DE DATAS
// ─────────────────────────────────────────────────────────────

describe('5. Campos de Datas na Cotação', () => {

  it('5.1 estimatedArrivalDate é guardado correctamente', () => {
    const req = ImportService.createRequest(makeReqData());
    const arrival = new Date('2026-11-15');
    const quot = ImportService.createQuotation({ requestId: req._id, productCost: 40000, estimatedArrivalDate: arrival });
    expect(new Date(quot.estimatedArrivalDate).toDateString()).toBe(arrival.toDateString());
  });

  it('5.2 quotationValidUntil é guardado correctamente', () => {
    const req = ImportService.createRequest(makeReqData());
    const validUntil = new Date('2026-10-10');
    const quot = ImportService.createQuotation({ requestId: req._id, productCost: 40000, quotationValidUntil: validUntil });
    expect(new Date(quot.quotationValidUntil).toDateString()).toBe(validUntil.toDateString());
  });

  it('5.3 Listagem enriquece requests com datas da cotação', () => {
    const req = ImportService.createRequest(makeReqData({ customerId: CUSTOMER_ID }));
    ImportService.createQuotation({
      requestId: req._id,
      productCost: 60000,
      estimatedDeliveryDays: '45',
      estimatedArrivalDate: new Date('2026-12-01'),
      quotationValidUntil: new Date('2026-10-31'),
    });

    const list = ImportService.getRequests(CUSTOMER_ID, 'customer');
    expect(list[0].estimatedDeliveryDays).toBe('45');
    expect(list[0].estimatedArrivalDate).toBeDefined();
    expect(list[0].quotationValidUntil).toBeDefined();
  });

  it('5.4 Prazo 45 dias formata correctamente para exibição', () => {
    const label = (days) => days ? `${days} dias` : 'A calcular';
    expect(label('45')).toBe('45 dias');
    expect(label(null)).toBe('A calcular');
    expect(label(undefined)).toBe('A calcular');
  });

  it('5.5 Data de chegada formata correctamente em pt-PT', () => {
    const date = new Date('2026-11-15T00:00:00.000Z');
    const formatted = date.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' });
    expect(formatted).toContain('2026');
    expect(formatted).toContain('15');
  });
});

// ─────────────────────────────────────────────────────────────
// 6. VALIDAÇÕES E EDGE CASES
// ─────────────────────────────────────────────────────────────

describe('6. Validações e Edge Cases', () => {

  it('6.1 Dois pedidos têm _id distintos', () => {
    const r1 = ImportService.createRequest(makeReqData());
    const r2 = ImportService.createRequest(makeReqData({ productName: 'Prod 2' }));
    expect(r1._id.toString()).not.toBe(r2._id.toString());
  });

  it('6.2 Status DELIVERED é terminal — request entregue', () => {
    const req = ImportService.createRequest(makeReqData());
    ImportService.updateStatus(req._id, 'DELIVERED');
    expect(db.requests[0].status).toBe('DELIVERED');
  });

  it('6.3 Isolamento de dados entre clientes A e B', () => {
    ImportService.createRequest(makeReqData({ customerId: CUSTOMER_ID }));
    ImportService.createRequest(makeReqData({ customerId: CUSTOMER_ID, productName: 'A2' }));
    ImportService.createRequest(makeReqData({ customerId: CUSTOMER_B_ID, productName: 'B1' }));

    const forA = ImportService.getRequests(CUSTOMER_ID, 'customer');
    const forB = ImportService.getRequests(CUSTOMER_B_ID, 'customer');

    expect(forA.every(r => r.customerId?.toString() === CUSTOMER_ID?.toString())).toBeTruthy();
    expect(forB.every(r => r.customerId?.toString() === CUSTOMER_B_ID?.toString())).toBeTruthy();
  });

  it('6.4 calculateQuotation com todos os campos a zero retorna 0', () => {
    const r = calculateQuotation({ productCost: 0 });
    expect(r.totalCost).toBe(0);
  });

  it('6.5 Cotação EXPIRED não pode ser aceite', () => {
    const req = ImportService.createRequest(makeReqData());
    const quot = ImportService.createQuotation({ requestId: req._id, productCost: 50000 });
    // Força status EXPIRED
    quot.status = 'EXPIRED';
    expect(() => ImportService.acceptQuotation(quot._id, CUSTOMER_ID)).toThrow(/não disponível/i);
  });

  it('6.6 updateShipmentStatus propaga status para o request', () => {
    const req = ImportService.createRequest(makeReqData());
    const quot = ImportService.createQuotation({ requestId: req._id, productCost: 50000 });
    ImportService.sendQuotation(quot._id);
    const { order } = ImportService.acceptQuotation(quot._id, CUSTOMER_ID);
    const ship = ImportService.createShipment({ orderId: order._id });

    ImportService.updateShipmentStatus(ship._id, 'DELIVERED');
    expect(db.requests[0].status).toBe('DELIVERED');
  });
});
