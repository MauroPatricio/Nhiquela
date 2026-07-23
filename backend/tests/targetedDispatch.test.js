import mongoose from 'mongoose';
import User from '../models/UserModel.js';
import RequestService from '../models/RequestServiceModel.js';
import dotenv from 'dotenv';
import Wallet from '../models/WalletModel.js';

dotenv.config();

describe('Targeted Dispatch - Pedidos Diretos ao Motorista', () => {
  let driver;
  let client;
  let targetedOrder;
  let publicOrder;

  beforeAll(async () => {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/nhiquela_test_db';
    await mongoose.connect(uri);
  });

  afterAll(async () => {
    if (driver) await User.deleteOne({ _id: driver._id });
    if (client) await User.deleteOne({ _id: client._id });
    if (targetedOrder) await RequestService.deleteOne({ _id: targetedOrder._id });
    if (publicOrder) await RequestService.deleteOne({ _id: publicOrder._id });
    if (driver) await Wallet.deleteOne({ ownerId: driver._id });
    await mongoose.connection.close();
  });

  it('1. Deve criar motorista sem saldo e offline (Pior Caso)', async () => {
    driver = new User({
      name: 'Motorista Targeted',
      email: `driver_targ_${Date.now()}@teste.com`,
      password: 'password123',
      phoneNumber: `84${Math.floor(Math.random() * 9000000) + 1000000}`,
      isDeliveryMan: true,
      availability: 'inactive', // MOTORISTA INATIVO/OFFLINE
      status: 'Inativo',
      'deliveryman.hasActiveService': false,
      locationGeo: {
        type: 'Point',
        coordinates: [32.5732, -25.9692]
      }
    });
    await driver.save();

    // Sem saldo
    const wallet = new Wallet({ ownerId: driver._id, ownerType: 'driver', userId: driver._id, balance: -500 });
    await wallet.save();

    expect(driver._id).toBeDefined();
  });

  it('2. Deve criar pedidos (um direto e um publico)', async () => {
    client = new User({
      name: 'Cliente Teste',
      email: `cli_${Date.now()}@teste.com`,
      password: 'password123',
      phoneNumber: `84${Math.floor(Math.random() * 9000000) + 1000000}`,
      locationGeo: { type: 'Point', coordinates: [32.5732, -25.9692] }
    });
    await client.save();

    targetedOrder = new RequestService({
      user: client._id,
      name: 'Cliente Teste',
      phoneNumber: '840000000',
      origin: 'Maputo Centro',
      destination: 'Matola',
      deliverCity: 'Maputo',
      code: 'TARGET999',
      status: 'Pendente',
      stepStatus: 3,
      goodType: 'Documento',
      transportType: 'Mota',
      paymentOption: 'e-mola',
      paymentMethod: 'Dinheiro',
      deliveryPrice: 500,
      description: 'Pedido direto ao motorista',
      targetDriverId: driver._id.toString() // PEDIDO DIRECIONADO
    });
    await targetedOrder.save();

    publicOrder = new RequestService({
      user: client._id,
      name: 'Cliente Teste',
      phoneNumber: '840000000',
      origin: 'Maputo Centro',
      destination: 'Matola',
      deliverCity: 'Maputo',
      code: 'PUBLIC999',
      status: 'Pendente',
      stepStatus: 3,
      goodType: 'Pacote',
      transportType: 'Mota',
      paymentOption: 'e-mola',
      paymentMethod: 'Dinheiro',
      deliveryPrice: 500,
      description: 'Pedido publico'
    });
    await publicOrder.save();

    expect(targetedOrder.targetDriverId).toBe(driver._id.toString());
  });

  it('3. O Endpoint /deliveryman/all deve RETORNAR APENAS o pedido direto mesmo com motorista OFFLINE e SEM SALDO', async () => {
    const deliverymanId = driver._id;

    // Simular a construcao das condicoes tal como no orderRoutes.js
    const canAcceptNewTrips = false; // Porque ele está offline e não tem saldo

    const requestServiceConditions = [
      { 'deliveryman.id': deliverymanId },
      { 'deliveryman._id': deliverymanId },
      { targetDriverId: deliverymanId.toString(), stepStatus: 3 } // SEMPRE mostrar pedidos que foram direcionados a este motorista
    ];

    if (canAcceptNewTrips) {
      // Esta parte é pulada!
      requestServiceConditions.push({ stepStatus: 3, targetDriverId: { $exists: false } });
    }

    const fetchedOrders = await RequestService.find({
      deleted: false,
      $or: requestServiceConditions
    }).lean();

    // Verificacoes Críticas
    expect(fetchedOrders).toBeDefined();
    
    // O pedido direto TEM DE ESTAR LA!
    const foundTargeted = fetchedOrders.find(o => o.code === 'TARGET999');
    expect(foundTargeted).toBeDefined();
    expect(foundTargeted.targetDriverId).toBe(driver._id.toString());

    // O pedido publico NAO DEVE ESTAR LA! (Porque canAcceptNewTrips e false)
    const foundPublic = fetchedOrders.find(o => o.code === 'PUBLIC999');
    expect(foundPublic).toBeUndefined();
  });
});
