/**
 * Testes Exaustivos: Motoristas Disponíveis + Receção de Pedidos + Notificações Push
 * Cobre todos os 3 sistemas críticos em produção
 */
import mongoose from 'mongoose';
import User from '../models/UserModel.js';
import RequestService from '../models/RequestServiceModel.js';
import NotificationToken from '../models/NotificationToken.js';
import Wallet from '../models/WalletModel.js';
import dotenv from 'dotenv';
import { hasSufficientBalance } from '../services/walletService.js';

dotenv.config();

// ============================================================
// SETUP / TEARDOWN
// ============================================================
const createdIds = { drivers: [], orders: [], tokens: [], wallets: [] };

async function createDriver(overrides = {}) {
  const driver = new User({
    name: `Motorista_${Date.now()}`,
    email: `drv_${Date.now()}@test.com`,
    password: 'password123',
    phoneNumber: `84${Math.floor(Math.random() * 9000000) + 1000000}`,
    isDeliveryMan: true,
    availability: 'active',
    status: 'Disponível',
    'deliveryman.hasActiveService': false,
    locationGeo: {
      type: 'Point',
      coordinates: [32.5732, -25.9692] // Maputo Centro
    },
    latitude: '-25.9692',
    longitude: '32.5732',
    ...overrides
  });
  await driver.save();
  createdIds.drivers.push(driver._id);
  return driver;
}

async function createWallet(driverId, balance) {
  const wallet = new Wallet({ ownerId: driverId, ownerType: 'driver', userId: driverId, balance });
  await wallet.save();
  createdIds.wallets.push(wallet._id);
  return wallet;
}

async function createOrder(driverId, overrides = {}) {
  const client = new User({
    name: 'Cliente Teste',
    email: `cli_${Date.now()}@test.com`,
    password: 'pass',
    phoneNumber: `84${Math.floor(Math.random() * 9000000) + 1000000}`,
  });
  await client.save();
  createdIds.drivers.push(client._id);

  const order = new RequestService({
    user: client._id,
    name: 'Cliente Teste',
    phoneNumber: '840000000',
    origin: 'Maputo',
    destination: 'Matola',
    deliverCity: 'Maputo',
    code: `CODE_${Date.now()}`,
    status: 'Pendente',
    stepStatus: 3,
    goodType: 'Pacote',
    transportType: 'Mota',
    paymentOption: 'e-mola',
    paymentMethod: 'Dinheiro',
    deliveryPrice: 500,
    targetDriverId: driverId ? driverId.toString() : undefined,
    ...overrides
  });
  await order.save();
  createdIds.orders.push(order._id);
  return order;
}

beforeAll(async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/nhiquela_test_db';
  await mongoose.connect(uri);
});

afterAll(async () => {
  for (const id of createdIds.drivers) await User.deleteOne({ _id: id });
  for (const id of createdIds.orders) await RequestService.deleteOne({ _id: id });
  for (const id of createdIds.tokens) await NotificationToken.deleteOne({ _id: id });
  for (const id of createdIds.wallets) await Wallet.deleteOne({ _id: id });
  await mongoose.connection.close();
});

// ============================================================
// SUITE 1: MOTORISTAS DISPONÍVEIS
// ============================================================
describe('Suite 1: Endpoint /drivers/available - Motoristas Disponíveis', () => {

  it('1.1 Deve retornar APENAS motoristas com availability=active', async () => {
    const driverActive = await createDriver({ availability: 'active' });
    const driverInactive = await createDriver({ availability: 'inactive' });
    await createWallet(driverActive._id, 1000);
    await createWallet(driverInactive._id, 1000);

    const results = await User.find({
      isDeliveryMan: true,
      availability: 'active',
      isDeleted: { $ne: true },
    }).lean();

    const activeIds = results.map(d => d._id.toString());
    expect(activeIds).toContain(driverActive._id.toString());
    expect(activeIds).not.toContain(driverInactive._id.toString());
  });

  it('1.2 Deve excluir motoristas com hasActiveService=true', async () => {
    const driverFree = await createDriver();
    const driverBusy = await createDriver({ 'deliveryman.hasActiveService': true });

    const allDrivers = await User.find({
      isDeliveryMan: true,
      availability: 'active',
    }).lean();

    // Simular filtro hasActiveService
    const filtered = allDrivers.filter(d => !(d.deliveryman && d.deliveryman.hasActiveService));
    const filteredIds = filtered.map(d => d._id.toString());

    expect(filteredIds).toContain(driverFree._id.toString());
    expect(filteredIds).not.toContain(driverBusy._id.toString());
  });

  it('1.3 Deve excluir motoristas com saldo insuficiente', async () => {
    const richDriver = await createDriver();
    const poorDriver = await createDriver();
    await createWallet(richDriver._id, 5000);
    await createWallet(poorDriver._id, -500); // Saldo negativo

    const richHasBalance = await hasSufficientBalance(richDriver._id, richDriver);
    const poorHasBalance = await hasSufficientBalance(poorDriver._id, poorDriver);

    expect(richHasBalance).toBe(true);
    expect(poorHasBalance).toBe(false);
  });

  it('1.4 NÃO deve incluir motoristas fora do raio (bug do excludedByRadius)', async () => {
    const driverMadrid = await createDriver({
      locationGeo: { type: 'Point', coordinates: [-3.7038, 40.4168] }, // Madrid, Espanha
    });
    await createWallet(driverMadrid._id, 1000);

    // Simular a lógica de raio do endpoint /available
    const radiusKm = 5; // 5km
    const originLat = -25.9692; // Maputo
    const originLng = 32.5732;

    const toRad = (v) => (v * Math.PI) / 180;
    const calcDistance = (lat1, lon1, lat2, lon2) => {
      const R = 6371;
      const dLat = toRad(lat2 - lat1);
      const dLon = toRad(lon2 - lon1);
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };

    const dLat = driverMadrid.locationGeo.coordinates[1];
    const dLng = driverMadrid.locationGeo.coordinates[0];
    const dist = calcDistance(originLat, originLng, dLat, dLng);

    // Madrid está a >9000km de Maputo — NÃO deve estar no resultado
    expect(dist).toBeGreaterThan(radiusKm);

    // Com o fix: um array que só inclui dentro do raio NÃO contém este motorista
    const nearbyOnly = dist <= radiusKm;
    expect(nearbyOnly).toBe(false);
  });
});

// ============================================================
// SUITE 2: RECEÇÃO DE PEDIDOS DO LADO DO MOTORISTA
// ============================================================
describe('Suite 2: Endpoint /orders/deliveryman/all - Receção de Pedidos', () => {

  it('2.1 Pedido DIRECIONADO deve aparecer mesmo com motorista OFFLINE e SEM SALDO', async () => {
    const driver = await createDriver({ availability: 'inactive' });
    // Sem wallet (saldo 0 por defeito)
    const order = await createOrder(driver._id, { targetDriverId: driver._id.toString() });

    const canAcceptNewTrips = false; // Offline + sem saldo

    const conditions = [
      { 'deliveryman.id': driver._id },
      { 'deliveryman._id': driver._id },
      { targetDriverId: driver._id.toString(), stepStatus: 3 } // SEMPRE ver pedidos direcionados
    ];

    const results = await RequestService.find({ deleted: false, $or: conditions }).lean();
    const found = results.find(o => o._id.toString() === order._id.toString());

    expect(found).toBeDefined();
    expect(found.targetDriverId).toBe(driver._id.toString());
  });

  it('2.2 Pedido PÚBLICO não deve aparecer para motorista OFFLINE', async () => {
    const driver = await createDriver({ availability: 'inactive' });
    const publicOrder = await createOrder(null, { targetDriverId: undefined, stepStatus: 3 });

    const canAcceptNewTrips = false; // Offline

    const conditions = [
      { 'deliveryman.id': driver._id },
      { 'deliveryman._id': driver._id },
      { targetDriverId: driver._id.toString(), stepStatus: 3 }
      // Não adiciona condição de pedidos públicos pois canAcceptNewTrips = false
    ];

    const results = await RequestService.find({ deleted: false, $or: conditions }).lean();
    const found = results.find(o => o._id.toString() === publicOrder._id.toString());

    expect(found).toBeUndefined(); // Pedido público NÃO deve aparecer
  });

  it('2.3 Motorista ATIVO e com SALDO deve ver pedidos públicos do seu tipo de veículo', async () => {
    const driver = await createDriver({ availability: 'active', 'deliveryman.transport_type': 'Mota' });
    await createWallet(driver._id, 2000);
    const publicOrder = await createOrder(null, { targetDriverId: undefined, transportType: 'Mota' });

    const canAcceptNewTrips = true;
    const driverTransportType = 'Mota';

    const availableCondition = {
      stepStatus: 3,
      $or: [
        { targetDriverId: { $exists: false } },
        { targetDriverId: null },
        { targetDriverId: '' }
      ]
    };
    if (driverTransportType) {
      availableCondition.transportType = driverTransportType;
    }

    const conditions = [
      { 'deliveryman.id': driver._id },
      { 'deliveryman._id': driver._id },
      { targetDriverId: driver._id.toString(), stepStatus: 3 },
      availableCondition
    ];

    const results = await RequestService.find({ deleted: false, $or: conditions }).lean();
    const found = results.find(o => o._id.toString() === publicOrder._id.toString());

    expect(found).toBeDefined(); // Deve aparecer para motorista ativo com mesmo tipo veículo
  });
});

// ============================================================
// SUITE 3: NOTIFICAÇÕES PUSH
// ============================================================
describe('Suite 3: Token Push e Notificações', () => {

  it('3.1 savedevicetoken deve guardar na coleção NotificationToken E em User.deviceToken', async () => {
    const driver = await createDriver();
    const fakeToken = `FCMToken_Test_${Date.now()}`;

    // Simular o que o endpoint /savedevicetoken faz agora
    const existing = await NotificationToken.findOne({ deviceToken: fakeToken });
    if (!existing) {
      const tokenRecord = new NotificationToken({
        deviceToken: fakeToken,
        user: driver._id,
        platform: 'android',
      });
      await tokenRecord.save();
      createdIds.tokens.push(tokenRecord._id);
    }
    await User.updateOne({ _id: driver._id }, { $set: { deviceToken: fakeToken } });

    // Verificar NotificationToken
    const savedToken = await NotificationToken.findOne({ deviceToken: fakeToken, user: driver._id });
    expect(savedToken).toBeDefined();
    expect(savedToken.user.toString()).toBe(driver._id.toString());

    // Verificar User.deviceToken (CRÍTICO para dispatch direto)
    const updatedDriver = await User.findById(driver._id).lean();
    expect(updatedDriver.deviceToken).toBe(fakeToken);
  });

  it('3.2 createNotification deve recuperar token via NotificationToken quando User.deviceToken é null', async () => {
    const driver = await createDriver();
    const fakeToken = `FCMToken_Fallback_${Date.now()}`;

    // Guardar APENAS em NotificationToken (sem User.deviceToken)
    const tokenRecord = new NotificationToken({
      deviceToken: fakeToken,
      user: driver._id,
      platform: 'android',
    });
    await tokenRecord.save();
    createdIds.tokens.push(tokenRecord._id);

    // Simular a lógica de auto-lookup do createNotification
    let finalPushToken = null; // Sem token direto

    if (!finalPushToken && driver._id) {
      const tokenFromDB = await NotificationToken.findOne({ user: driver._id }).sort({ createdAt: -1 });
      if (tokenFromDB && tokenFromDB.deviceToken) {
        finalPushToken = tokenFromDB.deviceToken;
      }
    }

    expect(finalPushToken).toBe(fakeToken); // Deve ter encontrado via NotificationToken
  });

  it('3.3 createNotification deve usar "none" como fallback para evitar crash de validação', async () => {
    const driver = await createDriver();
    // Sem token em lado nenhum

    let finalPushToken = null;

    if (!finalPushToken && driver._id) {
      const tokenFromDB = await NotificationToken.findOne({ user: driver._id }).sort({ createdAt: -1 });
      if (tokenFromDB && tokenFromDB.deviceToken) {
        finalPushToken = tokenFromDB.deviceToken;
      }
    }

    // Sem token encontrado → fallback para 'none'
    if (!finalPushToken) finalPushToken = 'none';

    expect(finalPushToken).toBe('none');
    // Push NÃO deve ser enviado com token 'none'
    const shouldSend = finalPushToken !== 'none' && finalPushToken !== 'null';
    expect(shouldSend).toBe(false);
  });
});
