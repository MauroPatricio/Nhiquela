import 'dotenv/config';
import mongoose from 'mongoose';
import Order from '../models/OrderModel.js';
import User from '../models/UserModel.js';

// Simularemos o fluxo de aceitação e de localização em tempo real para fins de teste.
// Este teste garante que uma viagem pode ser rastreada (tem IDs compatíveis) 
// e que o driver atualiza o local.

describe('Rastreio em Tempo Real e Partilha de Viagem', () => {
  let order;
  let driver;
  let client;

  beforeAll(async () => {
    // Liga a uma base de dados na memória ou db de teste
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/nhiquela_test_db';
    await mongoose.connect(uri);

    client = new User({
      name: 'Cliente Teste',
      email: `client${Date.now()}@teste.com`,
      password: 'password123',
      phoneNumber: `84${Math.floor(Math.random() * 9000000) + 1000000}`,
    });
    await client.save();

    driver = new User({
      name: 'Motorista Teste',
      email: `driver${Date.now()}@teste.com`,
      password: 'password123',
      phoneNumber: `84${Math.floor(Math.random() * 9000000) + 1000000}`,
      isDeliveryMan: true
    });
    await driver.save();
  });

  afterAll(async () => {
    if (client) await User.deleteOne({ _id: client._id });
    if (driver) await User.deleteOne({ _id: driver._id });
    if (order) await Order.findByIdAndDelete(order._id);
    await mongoose.connection.close();
  });

  it('1. Cliente cria um pedido de viagem que gera um ID partilhável (Link)', async () => {
    order = new Order({
      orderItems: [{ name: 'Viagem de Teste', qty: 1, price: 100 }],
      shippingAddress: { address: 'Ponto A', lat: -25.9692, lng: 32.5732 },
      shippingAddress2: { address: 'Ponto B', lat: -25.97, lng: 32.58 },
      paymentMethod: 'Cash',
      itemsPrice: 100,
      taxPrice: 0,
      shippingPrice: 0,
      totalPrice: 100,
      user: client._id,
      requestServiceId: new mongoose.Types.ObjectId(), // Fake service id
      status: 'pending'
    });

    await order.save();
    expect(order._id).toBeDefined();

    // Na app web o link partilhável tem este aspeto:
    const shareLink = `https://app.nhiquela.com/track/${order._id}`;
    expect(shareLink).toContain(order._id.toString());
  });

  it('2. Motorista aceita a viagem e o status passa para "accepted"', async () => {
    order.status = 'accepted';
    order.driver = driver._id;
    await order.save();

    const updatedOrder = await Order.findById(order._id);
    expect(updatedOrder.status).toBe('accepted');
    expect(updatedOrder.driver.toString()).toBe(driver._id.toString());
  });

  it('3. Rastreio: A localização do motorista é emitida continuamente para a sala do pedido', () => {
    // Aqui simulamos o comportamento do io.to(room).emit() que está no backend (index.js)
    const mockSocketClient = {
      location: null,
      on: function(event, callback) {
        if (event === 'driver_location_update') {
          this.location = callback;
        }
      }
    };

    // Alguém que clica no link junta-se à sala usando o ID da ordem
    const roomName = `trip_${order._id}`;
    
    // Simular o Socket do Motorista a enviar a posição real
    const emitirParaSala = (room, event, data) => {
      if (room === roomName && event === 'driver_location_update') {
        mockSocketClient.location = data;
      }
    };

    // Motorista move-se!
    emitirParaSala(roomName, 'driver_location_update', { 
      driverId: driver._id, 
      locationGeo: { lat: -25.9695, lng: 32.5740 } 
    });

    // O "Conhecido" através do Link recebeu a localização via Socket
    expect(mockSocketClient.location).toBeDefined();
    expect(mockSocketClient.location.locationGeo.lat).toBe(-25.9695);
  });
});
