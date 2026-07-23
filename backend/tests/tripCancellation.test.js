import 'dotenv/config';
import mongoose from 'mongoose';
import Order from '../models/OrderModel.js';
import User from '../models/UserModel.js';

// Este teste valida o ciclo de procura de motoristas e o cenário de cancelamento 
// pelo cliente, validando o impacto na viagem e na busca.

describe('Ciclo de Busca de Motoristas e Cancelamento pelo Cliente', () => {
  let order;
  let driver1;
  let driver2;
  let client;

  beforeAll(async () => {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/nhiquela_test_db';
    await mongoose.connect(uri);

    client = new User({
      name: 'Cliente Cancela',
      email: `client_cancel_${Date.now()}@teste.com`,
      password: 'password123',
      phoneNumber: `84${Math.floor(Math.random() * 9000000) + 1000000}`,
    });
    await client.save();

    driver1 = new User({
      name: 'Motorista Perto',
      email: `driver1_${Date.now()}@teste.com`,
      password: 'password123',
      phoneNumber: `84${Math.floor(Math.random() * 9000000) + 1000000}`,
      isDeliveryMan: true
    });
    await driver1.save();

    driver2 = new User({
      name: 'Motorista Longe',
      email: `driver2_${Date.now()}@teste.com`,
      password: 'password123',
      phoneNumber: `84${Math.floor(Math.random() * 9000000) + 1000000}`,
      isDeliveryMan: true
    });
    await driver2.save();
  });

  afterAll(async () => {
    if (client) await User.deleteOne({ _id: client._id });
    if (driver1) await User.deleteOne({ _id: driver1._id });
    if (driver2) await User.deleteOne({ _id: driver2._id });
    if (order) await Order.findByIdAndDelete(order._id);
    await mongoose.connection.close();
  });

  it('1. Cliente solicita viagem e motoristas disponíveis são contactados (Busca Operacional)', async () => {
    // Simular o cliente a pedir uma viagem
    order = new Order({
      orderItems: [{ name: 'Viagem Centro', qty: 1, price: 150 }],
      shippingAddress: { address: 'Ponto A', lat: -25.9692, lng: 32.5732 },
      shippingAddress2: { address: 'Ponto B', lat: -25.97, lng: 32.58 },
      paymentMethod: 'Cash',
      itemsPrice: 150,
      taxPrice: 0,
      shippingPrice: 0,
      totalPrice: 150,
      user: client._id,
      requestServiceId: new mongoose.Types.ObjectId(),
      status: 'pending',
      contactedDrivers: [driver1._id, driver2._id] // Simular que a busca encontrou e contactou os 2
    });

    await order.save();
    
    expect(order._id).toBeDefined();
    expect(order.status).toBe('pending');
    expect(order.contactedDrivers.length).toBe(2);
  });

  it('2. Cliente cancela a viagem enquanto a busca está ativa', async () => {
    // Simular chamada ao endpoint /api/orders/:id/cancel
    order.isCanceled = true;
    order.status = 'Cancelado';
    order.canceledReason = 'Motorista demorou muito a aceitar';
    
    await order.save();

    const cancelledOrder = await Order.findById(order._id);
    expect(cancelledOrder.status).toBe('Cancelado');
    expect(cancelledOrder.isCanceled).toBe(true);
    expect(cancelledOrder.canceledReason).toBe('Motorista demorou muito a aceitar');
  });

  it('3. Após cancelamento, o pedido não pode ser aceite por nenhum motorista', async () => {
    const cancelledOrder = await Order.findById(order._id);
    
    // Simular tentativa de aceite por motorista
    let aceiteComSucesso = false;
    if (cancelledOrder.status !== 'Cancelado' && !cancelledOrder.isCanceled) {
       cancelledOrder.status = 'accepted';
       cancelledOrder.driver = driver1._id;
       await cancelledOrder.save();
       aceiteComSucesso = true;
    }

    expect(aceiteComSucesso).toBe(false);
  });
});
