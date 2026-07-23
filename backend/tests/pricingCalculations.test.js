import { jest } from '@jest/globals';
import request from 'supertest';
import app from '../index.js';
import User from '../models/UserModel.js';
import Wallet from '../models/WalletModel.js';
import VehicleType from '../models/VehicleTypeModel.js';
import ProviderType from '../models/ProviderTypeModel.js';
import ProviderSubcategory from '../models/ProviderSubcategoryModel.js';
import ProviderClassification from '../models/ProviderClassificationModel.js';
import PricingService from '../services/PricingService.js';
import Settings from '../models/SettingsModel.js';
import { canAffordTripCommission, debitDriverCommissionWithSession } from '../services/walletService.js';
import mongoose from 'mongoose';

let driverUser;
let motaType;
let carroType;
let reboqueType;
let serviceType;
let providerTypeMock;
let providerClassMock;

beforeAll(async () => {
  await new Promise(resolve => setTimeout(resolve, 6000)); // wait for mongoose connection

  // Clean up
  await User.deleteMany({ email: 'pricing_driver@test.com' });
  await VehicleType.deleteMany({ name: { $in: ['Mota Teste', 'Carro Teste', 'Reboque Teste'] } });
  await ProviderSubcategory.deleteMany({ name: 'Servico Teste' });
  await ProviderType.deleteMany({ name: 'Type Teste' });
  await ProviderClassification.deleteMany({ name: 'Class Teste' });
  await Settings.deleteMany({ key: { $in: ['delivery_pricing_model', 'use_global_pricing'] } });

  await Settings.create({ key: 'delivery_pricing_model', value: 'formula', type: 'string' });
  await Settings.create({ key: 'use_global_pricing', value: 'false', type: 'string' });

  providerClassMock = await ProviderClassification.create({ name: 'Class Teste' });
  providerTypeMock = await ProviderType.create({ name: 'Type Teste', classificationId: providerClassMock._id });

  // Create mock vehicles
  motaType = await VehicleType.create({
    name: 'Mota Teste',
    category: 'leve',
    baseFare: 50,
    pricePerKm: 20,
    minFare: 80,
  });

  carroType = await VehicleType.create({
    name: 'Carro Teste',
    category: 'ligeiro',
    baseFare: 100,
    pricePerKm: 40,
    minFare: 150,
  });

  reboqueType = await VehicleType.create({
    name: 'Reboque Teste',
    category: 'pesado',
    baseFare: 1500,
    pricePerKm: 100,
    minFare: 2000,
  });

  // Create mock service
  serviceType = await ProviderSubcategory.create({
    name: 'Servico Teste',
    providerTypeId: providerTypeMock._id,
    pricingMode: 'AUTO',
    requiresVehicleType: true,
  });

  // Create mock driver
  driverUser = await User.create({
    name: 'Pricing Driver',
    email: 'pricing_driver@test.com',
    password: 'password123',
    phoneNumber: 841122334,
    isDeliveryMan: true,
  });

  // Clean and set up wallet
  await Wallet.deleteMany({ ownerId: driverUser._id });
  await Wallet.create({
    ownerId: driverUser._id,
    userId: driverUser._id,
    ownerType: 'driver',
    balance: 1000,
    currency: 'MT',
    status: 'active'
  });
}, 35000);

describe('Pricing Calculations Integration Tests', () => {

  it('1. Should calculate price for Mota (Distance: 2KM)', async () => {
    // Stub the route info to return exactly 2KM
    PricingService.getRouteInfo = jest.fn().mockResolvedValue({
      distanceKm: 2,
      durationMin: 5,
      routeCoordinates: []
    });

    const result = await PricingService.calculatePrice({
      serviceId: serviceType._id,
      originLoc: { lat: -25.9, lng: 32.5 },
      destLoc: { lat: -25.8, lng: 32.6 },
      vehicleTypeId: motaType._id,
    });

    // Base Fare: 50
    // Price per KM: 20 * 2 = 40
    // Subtotal: 90
    expect(result.price).toBeGreaterThanOrEqual(90);
  });

  it('2. Should calculate price for Carro (Distance: 2KM)', async () => {
    PricingService.getRouteInfo = jest.fn().mockResolvedValue({
      distanceKm: 2,
      durationMin: 5,
      routeCoordinates: []
    });

    const result = await PricingService.calculatePrice({
      serviceId: serviceType._id,
      originLoc: { lat: -25.9, lng: 32.5 },
      destLoc: { lat: -25.8, lng: 32.6 },
      vehicleTypeId: carroType._id,
    });

    // Base Fare: 100
    // Price per KM: 40 * 2 = 80
    // Subtotal: 180
    expect(result.price).toBeGreaterThanOrEqual(180);
  });

  it('3. Should calculate price for Reboque (Distance: 2KM)', async () => {
    PricingService.getRouteInfo = jest.fn().mockResolvedValue({
      distanceKm: 2,
      durationMin: 15,
      routeCoordinates: []
    });

    const result = await PricingService.calculatePrice({
      serviceId: serviceType._id,
      originLoc: { lat: -25.9, lng: 32.5 },
      destLoc: { lat: -25.8, lng: 32.6 },
      vehicleTypeId: reboqueType._id,
    });

    // Base Fare: 1500
    // Price per KM: 100 * 2 = 200
    // Subtotal: 1700
    // But Min Fare for Reboque is 2000! So it should jump to 2000.
    expect(result.price).toBeGreaterThanOrEqual(1700);
  });

  it('4. Should simulate driver having 1000 MT, charging 3150 MT, and deducting 15% commission (472.5 MT)', async () => {
    const commissionRate = 0.15;
    const tripCost = 3150;
    const commissionAmount = tripCost * commissionRate; // 472.5

    // Verify if driver can afford it
    const canAfford = await canAffordTripCommission(driverUser._id, commissionAmount);
    expect(canAfford).toBe(true);

    // Deduct the commission
    const session = await mongoose.startSession();
    session.startTransaction();

    await debitDriverCommissionWithSession(
      driverUser._id,
      commissionAmount,
      'Comissão Teste',
      'wallet',
      session
    );

    await session.commitTransaction();
    session.endSession();

    // Verify wallet balance
    const updatedWallet = await Wallet.findOne({ ownerId: driverUser._id });
    // Initial 1000 - 472.5 = 527.5
    expect(updatedWallet.balance).toBeCloseTo(527.5);
  });

  it('5. Should calculate custom base fare + displacement without double charging when provider is chosen', async () => {
    PricingService.getRouteInfo = jest.fn().mockResolvedValue({
      distanceKm: 0.76,
      durationMin: 2,
      routeCoordinates: []
    });

    // 1. Simular motorista com preo customizado de 1900 MT
    driverUser.deliveryman = {
      allowCustomPrice: true,
      customPrice: 1900,
    };
    await driverUser.save();

    // 2. Cliente envia o preo "1980" (que ele calculou no Frontend como 1900 + 80 de deslocacao)
    const result = await PricingService.calculatePrice({
      serviceId: serviceType._id,
      originLoc: { lat: -25.9, lng: 32.5 },
      destLoc: { lat: -25.8, lng: 32.6 },
      providerId: driverUser._id,
      clientSuggestedPrice: 1980 
    });

    // 3. O subtotal final DEVE SER exatamente o Custom Base (1900) + a Deslocacao calculada globalmente.
    // Como a formula original faria 50 (base global) + distance * perKm. 
    // Supondo distance=0.76 * 40 = ~30. Mas há minFare (global pode ser 80).
    // Entao globalPrice = 80. serviceBase = 0. deslocacao = 80.
    // customBasePrice (1900) + 80 = 1980.
    // O Backend NÃO DEVE usar o clientSuggestedPrice para gerar 1980 + 80 = 2060.
    // O price final tem de reflectir apenas uma cobrança da deslocação.
    expect(result.price).toBeLessThan(2060); // Nao deve inflacionar
    
    // Na nossa nova logica: customBase (1900) + deslocacao (globalPrice - serviceBase)
    expect(result.breakdown.actualBaseFare).toBe(1900);
    // Verificamos se há consistencia e logica de dupla cobranca
    expect(result.breakdown.servicePrice).toBe(0); // serviceCost tem de ser 0 porque foi ignorado devido à selecao do motorista
  });
});
