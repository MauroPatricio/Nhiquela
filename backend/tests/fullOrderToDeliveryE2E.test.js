/**
 * ============================================================================
 * FULL E2E: nhiquela → nhiquelaseller → nhiqueladriver → nhiquela
 * ============================================================================
 * Simula o fluxo completo de produção:
 *  1. Cliente cria pedido (nhiquela)
 *  2. Fornecedor aceita pedido (nhiquelaseller) → comissão debitada
 *  3. Fornecedor marca pedido "Disponível p/ entrega" com targetDriverId (nhiquelaseller)
 *  4. Motorista aceita o RequestService de entrega (nhiqueladriver)
 *  5. Motorista finaliza a entrega (nhiqueladriver)
 *  6. Cliente verifica que o pedido está "Entregue" (nhiquela)
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';

import User from '../models/UserModel.js';
import Order from '../models/OrderModel.js';
import Product from '../models/ProductModel.js';
import Provider from '../models/ProviderModel.js';
import Wallet from '../models/WalletModel.js';
import RequestService from '../models/RequestServiceModel.js';
import Settings from '../models/SettingsModel.js';
import Category from '../models/CategoryModel.js';
import VehicleType from '../models/VehicleTypeModel.js';
import ProviderSubcategory from '../models/ProviderSubcategoryModel.js';
import ProviderType from '../models/ProviderTypeModel.js';
import ProviderClassification from '../models/ProviderClassificationModel.js';

import orderRoutes from '../routes/orderRoutes.js';
import requestServiceRoutes from '../routes/requestServiceRoutes.js';
import driverRoutes from '../routes/driverRoutes.js';

const app = express();
app.use(express.json());

// Mock IO
const mockIo = {
  to: () => ({ emit: () => {} }),
  in: () => ({ emit: () => {}, fetchSockets: async () => [] }),
  emit: () => {},
};
app.set('io', mockIo);

app.use('/api/orders', orderRoutes);
app.use('/api/request-services', requestServiceRoutes);
app.use('/api/drivers', driverRoutes);

const JWT_SECRET = process.env.JWT_SECRET || 'somethingsecret';
const generateToken = (user) =>
  jwt.sign(
    { _id: user._id, name: user.name, email: user.email, isAdmin: user.isAdmin || false },
    JWT_SECRET,
    { expiresIn: '30d' }
  );

// ============================================================
// LIFECYCLE
// ============================================================
let clientUser, clientToken;
let sellerUser, sellerToken, providerId;
let driverUser, driverToken;
let vehicleTypeId, subcategoryId;
let orderId, requestServiceId;

const TS = Date.now();
const SELLER_EMAIL = `seller_e2e_${TS}@nhiquela.test`;
const CLIENT_EMAIL = `client_e2e_${TS}@nhiquela.test`;
const DRIVER_EMAIL = `driver_e2e_${TS}@nhiquela.test`;

beforeAll(async () => {
  await mongoose.connect(process.env.MONGODB_URI);

  // Platform commission rate
  await Settings.findOneAndUpdate(
    { key: 'platform_commission_rate' },
    { key: 'platform_commission_rate', value: '10' },
    { upsert: true }
  );

  // VehicleType: Mota
  const vt = await VehicleType.create({
    name: 'Mota E2E',
    category: 'leve',
    basePrice: 50,
    baseFare: 50,
    pricePerKm: 10,
    isActive: true,
  });
  vehicleTypeId = vt._id;

  // ProviderSubcategory (SERVICE)
  // ProviderType and ProviderClassification imported at top
  const Classification = ProviderClassification;
  let serviceCls = await ProviderClassification.findOne({ name: 'SERVICE' });
  if (!serviceCls) {
    serviceCls = await ProviderClassification.create({ name: 'SERVICE' });
  }
  let serviceProvType = await ProviderType.findOne({ classificationId: serviceCls._id });
  if (!serviceProvType) {
    serviceProvType = await ProviderType.create({ name: 'Transporte E2E', classificationId: serviceCls._id });
  }

  const subcat = await ProviderSubcategory.create({
    name: 'Entregas Mota E2E',
    providerTypeId: serviceProvType._id,
    isActive: true,
    vehicleTypes: [vehicleTypeId],
    baseFare: 50,
    pricePerKm: 10,
  });
  subcategoryId = subcat._id;

  // ---- SELLER ----
  sellerUser = await User.create({
    name: 'Vendedor E2E',
    email: SELLER_EMAIL,
    password: 'password123',
    phoneNumber: `258840${Math.floor(Math.random() * 900000) + 100000}`,
    isSeller: true,
    completedOrders: 5,
    seller: {
      name: 'Loja E2E',
      tipoEstabelecimento: subcategoryId,
      latitude: -25.9690,
      longitude: 32.5730,
      location: { lat: -25.9690, lng: 32.5730, address: 'Av. Julius Nyerere 100, Maputo' },
      hasUsedFreeSale: true,
    },
  });
  sellerToken = generateToken(sellerUser);

  const provider = await Provider.create({
    ownerId: sellerUser._id,
    userId: sellerUser._id,
    name: 'Loja E2E',
    providerType: 'Loja',
    phoneNumber: sellerUser.phoneNumber,
    nuit: '999888777',
    status: 'active',
    location: { lat: -25.9690, lng: 32.5730, address: 'Av. Julius Nyerere 100, Maputo' },
  });
  providerId = provider._id;

  // Seller wallet
  await Wallet.create({
    ownerId: sellerUser._id,
    ownerType: 'seller',
    userId: sellerUser._id,
    balance: 5000,
  });

  // ---- CLIENT ----
  clientUser = await User.create({
    name: 'Cliente E2E',
    email: CLIENT_EMAIL,
    password: 'password123',
    phoneNumber: `258841${Math.floor(Math.random() * 900000) + 100000}`,
  });
  clientToken = generateToken(clientUser);

  // ---- DRIVER ----
  driverUser = await User.create({
    name: 'Motoqueiro E2E',
    email: DRIVER_EMAIL,
    password: 'password123',
    phoneNumber: `258842${Math.floor(Math.random() * 900000) + 100000}`,
    isDeliveryMan: true,
    isApproved: true,
    availability: 'active',
    status: 'Disponível',
    completedOrders: 3,
    latitude: -25.9700,
    longitude: 32.5740,
    locationGeo: { type: 'Point', coordinates: [32.5740, -25.9700] },
    deliveryman: {
      status: 'Ativo',
      register_conformance: 'CONFORMANCE',
      transport_type: 'Mota E2E',
      hasActiveService: false,
    },
  });
  driverToken = generateToken(driverUser);

  // Driver wallet
  await Wallet.create({
    ownerId: driverUser._id,
    ownerType: 'driver',
    userId: driverUser._id,
    balance: 2000,
  });

  // Create a product for the seller
  let cat = await Category.findOne({ slug: 'e2e-cat' });
  if (!cat) {
    cat = await Category.create({ name: 'E2E Category', nome: 'Categoria E2E', slug: 'e2e-cat' });
  }

  await Product.create({
    name: 'Produto E2E',
    nome: 'Produto E2E',
    slug: `produto-e2e-${TS}`,
    price: 550,
    priceFromSeller: 500,
    comissionPercentage: 10,
    priceComission: 50,
    countInStock: 10,
    category: cat._id,
    seller: providerId,
    brand: 'E2E',
    description: 'Produto para teste E2E',
    image: 'https://via.placeholder.com/200',
  });
}, 60000);

afterAll(async () => {
  // Cleanup
  const emails = [SELLER_EMAIL, CLIENT_EMAIL, DRIVER_EMAIL];
  await User.deleteMany({ email: { $in: emails } });
  await Provider.deleteMany({ ownerId: sellerUser?._id });
  await Wallet.deleteMany({ ownerId: { $in: [sellerUser?._id, driverUser?._id] } });
  if (orderId) await Order.deleteMany({ _id: orderId });
  if (requestServiceId) await RequestService.deleteMany({ _id: requestServiceId });
  await VehicleType.deleteMany({ name: 'Mota E2E' });
  await ProviderSubcategory.deleteMany({ name: 'Entregas Mota E2E' });
  await Product.deleteMany({ slug: `produto-e2e-${TS}` });
  await Category.deleteMany({ slug: 'e2e-cat' });
  await mongoose.connection.close();
}, 30000);

// ============================================================
// TESTS
// ============================================================

describe('Full E2E: nhiquela -> nhiquelaseller -> nhiqueladriver -> nhiquela', () => {

  // STEP 1: Cliente cria pedido (nhiquela)
  it('1. Cliente cria pedido com sucesso (nhiquela)', async () => {
    const product = await Product.findOne({ slug: `produto-e2e-${TS}` });
    expect(product).toBeDefined();

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        orderItems: [
          {
            _id: product._id,
            name: product.name,
            quantity: 2,
            seller: providerId,
            price: 500,
            image: product.image,
          },
        ],
        address: {
          fullName: 'Cliente E2E',
          address: 'Rua de Teste 123, Matola',
          city: 'Matola',
          phoneNumber: clientUser.phoneNumber,
          lat: -25.9800,
          lng: 32.4600,
        },
        paymentMethod: 'Dinheiro',
        itemsPrice: 1000,
        deliveryPrice: 150,
        addressPrice: 150,
        taxPrice: 0,
        totalPrice: 1150,
        itemsPriceForSeller: 1000,
        isUserWantDelivery: true,
        isPaid: false,
        transportTypeId: vehicleTypeId,
        transportType: 'Mota E2E',
        origin: 'Av. Julius Nyerere 100, Maputo',
        destination: 'Rua de Teste 123, Matola',
        originDetails: { address: 'Av. Julius Nyerere 100, Maputo', lat: -25.9690, lng: 32.5730 },
        destinationDetails: { address: 'Rua de Teste 123, Matola', lat: -25.9800, lng: 32.4600 },
      });

    expect(res.status).toBe(201);
    expect(res.body.order).toBeDefined();
    orderId = res.body.order._id;

    // Verificar estado inicial do pedido
    const order = await Order.findById(orderId);
    expect(order.status).toBe('Pendente');
    expect(order.transportType).toBe('Mota E2E');
  });

  // STEP 2: Fornecedor aceita pedido (nhiquelaseller)
  it('2. Fornecedor aceita o pedido e comissao e debitada (nhiquelaseller)', async () => {
    const walletBefore = await Wallet.findOne({ ownerId: sellerUser._id });
    const balanceBefore = walletBefore.balance;

    const res = await request(app)
      .put(`/api/orders/${orderId}/respond`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ action: 'accept' });

    expect(res.status).toBe(200);

    // Verificar que o pedido foi aceite
    const order = await Order.findById(orderId);
    expect(order.isAccepted).toBe(true);
    expect(order.status).toBe('Aceite');

    // Verificar que a comissao foi debitada da carteira do fornecedor
    const walletAfter = await Wallet.findOne({ ownerId: sellerUser._id });
    expect(walletAfter.balance).toBeLessThan(balanceBefore);
    console.log(`Comissao debitada: ${balanceBefore} -> ${walletAfter.balance} MT (debitado ${balanceBefore - walletAfter.balance} MT)`);

    // Verificar que o stock diminuiu
    const product = await Product.findOne({ slug: `produto-e2e-${TS}` });
    expect(product.countInStock).toBe(8); // 10 - 2
  });

  // STEP 3: Fornecedor marca "Disponivel p/ entrega" com motorista alvo (nhiquelaseller)
  it('3. Fornecedor marca pedido como disponivel para entrega com motorista especifico (nhiquelaseller)', async () => {
    const res = await request(app)
      .put(`/api/orders/${orderId}/toDeliv`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        transportTypeId: vehicleTypeId,
        transportType: 'Mota E2E',
        targetDriverId: driverUser._id.toString(),
      });

    expect(res.status).toBe(200);
    expect(res.body.order).toBeDefined();

    // Verificar que o RequestService foi criado
    const order = await Order.findById(orderId);
    expect(order.isAvailableToDeliver).toBe(true);
    expect(order.status).toBe('Disponível para entrega');
    expect(order.requestServiceId).toBeDefined();
    requestServiceId = order.requestServiceId;

    // Verificar que o RequestService tem o targetDriverId e pagamento na entrega
    const rs = await RequestService.findById(requestServiceId);
    expect(rs).toBeDefined();
    expect(rs.targetDriverId).toBe(driverUser._id.toString());
    expect(rs.paymentMethod).toBe('Dinheiro');
    expect(rs.paymentOption).toBe('Pagamento na entrega');
    console.log(`RequestService criado: ${rs._id} com targetDriverId: ${rs.targetDriverId}`);
  });

  // STEP 4: Motorista aceita o pedido de entrega (nhiqueladriver)
  it('4. Motorista aceita o pedido de entrega dirigido a ele (nhiqueladriver)', async () => {
    const res = await request(app)
      .put(`/api/request-services/${requestServiceId}/acceptedByDeliveryman`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({});

    expect(res.status).toBe(200);

    // Verificar que o motorista foi atribuido
    const rs = await RequestService.findById(requestServiceId);
    expect(rs.deliveryman).toBeDefined();
    expect(rs.deliveryman.id.toString()).toBe(driverUser._id.toString());
    expect(rs.status).not.toBe('Pendente');
    console.log(`Motorista ${driverUser.name} aceitou a entrega. Status: ${rs.status}`);
  });

  // STEP 5: Motorista finaliza a entrega (nhiqueladriver)
  it('5. Motorista finaliza a entrega e comissao de frete e debitada (nhiqueladriver)', async () => {
    const driverWalletBefore = await Wallet.findOne({ ownerId: driverUser._id });
    const driverBalanceBefore = driverWalletBefore.balance;

    const res = await request(app)
      .put(`/api/request-services/${requestServiceId}/deliver`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({});

    expect(res.status).toBe(200);

    // Verificar que a viagem foi concluida
    const rs = await RequestService.findById(requestServiceId);
    expect(rs.isDelivered).toBe(true);
    expect(rs.status).toBe('Concluído');

    // Verificar comissao debitada da carteira do motorista
    const driverWalletAfter = await Wallet.findOne({ ownerId: driverUser._id });
    expect(driverWalletAfter.balance).toBeLessThan(driverBalanceBefore);
    console.log(`Comissao de frete debitada do motorista: ${driverBalanceBefore} -> ${driverWalletAfter.balance} MT`);
  });

  // STEP 6: Cliente verifica que o pedido foi entregue (nhiquela)
  it('6. Cliente verifica que o pedido consta na lista com RequestService concluido (nhiquela)', async () => {
    const res = await request(app)
      .get('/api/orders/mine')
      .set('Authorization', `Bearer ${clientToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);

    const myOrder = res.body.find((o) => o._id.toString() === orderId.toString());
    expect(myOrder).toBeDefined();
    expect(myOrder.isAccepted).toBe(true);
    expect(myOrder.isAvailableToDeliver).toBe(true);

    // O RequestService associado ao pedido deve estar concluido
    const rs = await RequestService.findById(requestServiceId);
    expect(rs.isDelivered).toBe(true);
    expect(rs.status).toBe('Concluído');

    console.log(`Pedido ${myOrder.code || orderId} esta presente na lista do cliente. Entrega concluida!`);
  });

  // STEP 7: Verificacao final de integridade
  it('7. Verificacao final de integridade de dados', async () => {
    // Order
    const order = await Order.findById(orderId);
    expect(order).toBeDefined();
    expect(order.transportTypeId.toString()).toBe(vehicleTypeId.toString());
    expect(order.transportType).toBe('Mota E2E');
    expect(order.requestServiceId).toBeDefined();

    // RequestService
    const rs = await RequestService.findById(requestServiceId);
    expect(rs).toBeDefined();
    expect(rs.targetDriverId).toBe(driverUser._id.toString());
    expect(rs.deliveryman.id.toString()).toBe(driverUser._id.toString());
    expect(rs.isDelivered).toBe(true);
    expect(rs.paymentMethod).toBe('Dinheiro');
    expect(rs.paymentOption).toBe('Pagamento na entrega');

    // Wallets — both should have reduced
    const sellerWallet = await Wallet.findOne({ ownerId: sellerUser._id });
    expect(sellerWallet.balance).toBeLessThan(5000); // comissao plataforma debitada

    const driverWallet = await Wallet.findOne({ ownerId: driverUser._id });
    expect(driverWallet.balance).toBeLessThan(2000); // comissao frete debitada

    // Product stock
    const product = await Product.findOne({ slug: `produto-e2e-${TS}` });
    expect(product.countInStock).toBe(8); // 10 - 2

    // Driver status (deve permanecer ativo pois tem saldo suficiente)
    const driver = await User.findById(driverUser._id);
    expect(driver.deliveryman.hasActiveService).toBe(false);

    console.log('=== VERIFICACAO FINAL DE INTEGRIDADE COMPLETA ===');
    console.log(`   Pedido: ${order.status} (isAccepted: ${order.isAccepted})`);
    console.log(`   Entrega: ${rs.status} (isDelivered: ${rs.isDelivered})`);
    console.log(`   Carteira Fornecedor: ${sellerWallet.balance} MT (de 5000 MT)`);
    console.log(`   Carteira Motorista: ${driverWallet.balance} MT (de 2000 MT)`);
    console.log(`   Stock: ${product.countInStock} (de 10)`);
    console.log(`   Veiculo: ${order.transportType}`);
  });
});
