import 'dotenv/config';
import mongoose from 'mongoose';
import express from 'express';
import request from 'supertest';
import Order from '../models/OrderModel.js';
import RequestService from '../models/RequestServiceModel.js';
import User from '../models/UserModel.js';
import Wallet from '../models/WalletModel.js';
import PricingEngine from '../models/PricingEngineModel.js';
import Settings from '../models/SettingsModel.js';
import requestServiceRoutes from '../routes/requestServiceRoutes.js';
import driverRoutes from '../routes/driverRoutes.js';
import jwt from 'jsonwebtoken';
import { getFinancialConfig, canAffordTripCommission } from '../services/walletService.js';

const app = express();
app.use(express.json());

// Mock IO
app.set('io', {
  to: () => ({ emit: () => {} }),
  emit: () => {}
});

app.use('/api/request-services', requestServiceRoutes);
app.use('/api/drivers', driverRoutes);

describe('Trip Commission and Negative Balance Flow', () => {
  let driverToken, driverId, tripId, clientId;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI);

    // Setup Pricing Engine & Settings
    await PricingEngine.deleteMany({});
    const pricing = new PricingEngine({
      financialEngine: {
        allowNegativeBalance: true,
        creditLimit: -500, // They can go up to -500
        minOperationalBalance: 500,
        autoDisableOnLowBalance: true
      }
    });
    await pricing.save();

    await Settings.deleteMany({ key: 'driver_commission_rate' });
    const settings = new Settings({ key: 'driver_commission_rate', value: '15' }); // 15%
    await settings.save();

    const VehicleType = (await import('../models/VehicleTypeModel.js')).default;
    await VehicleType.deleteMany({});
    const vt = new VehicleType({
      name: 'Reboque Ligeiro',
      minVisibilityFee: 500
    });
    await vt.save();

    // Criar Cliente
    const client = new User({
      name: 'Client Test',
      email: `client_${Date.now()}@test.com`,
      password: 'password',
      phoneNumber: 840000010 + Math.floor(Math.random() * 10000),
      latitude: 10,
      longitude: 10
    });
    await client.save();
    clientId = client._id;

    // Criar Motorista
    const driver = new User({
      name: 'Reboque Driver',
      email: `driver_${Date.now()}@test.com`,
      password: 'password',
      phoneNumber: 840000011 + Math.floor(Math.random() * 10000),
      isDeliveryMan: true,
      status: 'Disponível',
      latitude: -25.9690,
      longitude: 32.5730,
      deliveryman: {
        status: 'Ativo',
        register_conformance: 'CONFORMANCE',
        transport_type: 'Reboque Ligeiro'
      }
    });
    await driver.save();
    driverId = driver._id;

    driverToken = jwt.sign(
      { _id: driverId, name: driver.name, email: driver.email, isAdmin: false },
      process.env.JWT_SECRET || 'somethingsecret',
      { expiresIn: '30d' }
    );

    // Carregar carteira com exatamente 500 MT
    const wallet = new Wallet({
      user: driverId,
      ownerType: 'driver',
      ownerId: driverId,
      balance: 500,
      currency: 'MZN'
    });
    await wallet.save();

  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  it('should allow driver to accept trip since balance (500) >= limit (500) and then suspend him after trip', async () => {
    // Verificar se ele pode aceitar uma viagem (A comissão de 3580 é 537)
    // 500 >= 500 (limit) -> Deve ser True!
    const canAfford = await canAffordTripCommission(driverId, 537);
    expect(canAfford).toBe(true);

    // Criar uma Viagem (RequestService) pendente associada a ele
    const trip = new RequestService({
      user: clientId,
      name: 'Client',
      phoneNumber: 840000010,
      origin: 'Maputo',
      destination: 'Matola',
      deliverCity: 'Maputo',
      transportType: 'Reboque',
      goodType: 'Carro',
      deliveryman: {
        id: driverId
      },
      status: 'Pendente',
      totalPrice: 3580,
      deliveryPrice: 3580,
      paymentMethod: 'Dinheiro',
      pickupDetails: { address: 'Origin' },
      destinationDetails: { address: 'Dest' }
    });
    await trip.save();
    tripId = trip._id;

    // O Motorista Finaliza a viagem
    // Isso deve desencadear o débito de 15% de 3580 = 537
    const response = await request(app)
      .put(`/api/request-services/${tripId}/deliver`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({});

    if (response.status !== 200) {
      console.log(response.body);
    }
    
    expect(response.status).toBe(200);

    // Agora vamos verificar a carteira do motorista
    const wallet = await Wallet.findOne({ ownerId: driverId });
    expect(wallet.balance).toBe(500 - 537); // -37

    // E o estado do motorista deve ser 'Inativo' e 'INCONFORMANCE'
    const driver = await User.findById(driverId);
    expect(driver.status).toBe('Inativo');
    expect(driver.deliveryman.register_conformance).toBe('INCONFORMANCE');
  });
});
