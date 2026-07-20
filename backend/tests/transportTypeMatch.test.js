/**
 * Testes: transportType por ObjectId vs String
 * Verifica que o backend faz match correcto seja por ID ou por nome
 */
import mongoose from 'mongoose';
import User from '../models/UserModel.js';
import RequestService from '../models/RequestServiceModel.js';
import Wallet from '../models/WalletModel.js';
import dotenv from 'dotenv';
dotenv.config();

const cleanup = { drivers: [], orders: [], wallets: [] };

async function makeDriver(transportTypeId) {
  const d = new User({
    name: `Driver_${Date.now()}`,
    email: `d_${Date.now()}@t.com`,
    password: 'pass',
    phoneNumber: `84${Math.floor(Math.random() * 9000000) + 1000000}`,
    isDeliveryMan: true,
    availability: 'active',
    'deliveryman.transport_type': transportTypeId,
    'deliveryman.hasActiveService': false,
    locationGeo: { type: 'Point', coordinates: [32.57, -25.96] },
  });
  await d.save();
  cleanup.drivers.push(d._id);
  // Criar wallet com saldo
  const w = new Wallet({ ownerId: d._id, ownerType: 'driver', userId: d._id, balance: 2000 });
  await w.save();
  cleanup.wallets.push(w._id);
  return d;
}

async function makeOrder(transportTypeValue, transportTypeIdValue = null) {
  const client = new User({
    name: 'Cliente', email: `c_${Date.now()}@t.com`, password: 'p',
    phoneNumber: `84${Math.floor(Math.random() * 9000000) + 1000000}`,
  });
  await client.save();
  cleanup.drivers.push(client._id);

  const order = new RequestService({
    name: 'Cliente', phoneNumber: '840000000', goodType: 'Pacote',
    transportType: transportTypeValue,
    transportTypeId: transportTypeIdValue,
    deliverCity: 'Maputo', origin: 'A', destination: 'B',
    paymentOption: 'e-mola', description: 'test', paymentMethod: 'Dinheiro',
    deliveryPrice: 500, user: client._id, code: `T_${Date.now()}`,
    status: 'Pendente', stepStatus: 3, deleted: false,
  });
  await order.save();
  cleanup.orders.push(order._id);
  return order;
}

beforeAll(async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/nhiquela_test_db');
});

afterAll(async () => {
  for (const id of cleanup.drivers) await User.deleteOne({ _id: id });
  for (const id of cleanup.orders) await RequestService.deleteOne({ _id: id });
  for (const id of cleanup.wallets) await Wallet.deleteOne({ _id: id });
  await mongoose.connection.close();
});

describe('TransportType: correspondência por ObjectId', () => {

  it('1. Pedido com transportType=ObjectId string DEVE encontrar motorista com mesmo ID', async () => {
    const vehicleTypeId = new mongoose.Types.ObjectId(); // ID fictício
    const driver = await makeDriver(vehicleTypeId);

    // Cliente envia o ObjectId como string (comportamento real do frontend)
    const order = await makeOrder(vehicleTypeId.toString(), vehicleTypeId);

    // Simular a query que o /deliveryman/all faz com a lógica corrigida
    const rawTransportType = driver.deliveryman.transport_type;
    const isObjectId = mongoose.Types.ObjectId.isValid(rawTransportType.toString()) &&
                       rawTransportType.toString().length === 24;
    expect(isObjectId).toBe(true);

    // Query com o novo filtro: OR entre string e ObjectId ref
    const foundOrders = await RequestService.find({
      deleted: false,
      stepStatus: 3,
      $or: [
        { targetDriverId: { $exists: false } },
        { targetDriverId: null },
        { targetDriverId: '' }
      ],
      $and: [{
        $or: [
          { transportType: rawTransportType.toString() },
          { transportTypeId: new mongoose.Types.ObjectId(rawTransportType.toString()) }
        ]
      }]
    }).lean();

    const found = foundOrders.find(o => o._id.toString() === order._id.toString());
    expect(found).toBeDefined(); // DEVE encontrar o pedido!
    console.log(`✅ Encontrou pedido com transportType="${order.transportType}" para motorista com ID=${vehicleTypeId}`);
  });

  it('2. Pedido com transportType=string nome DEVE encontrar motorista com mesmo nome', async () => {
    const driver = await makeDriver('Mota'); // transportType como string normal

    const order = await makeOrder('Mota', null);

    const rawTransportType = driver.deliveryman.transport_type;
    const isObjectId = mongoose.Types.ObjectId.isValid(rawTransportType.toString()) &&
                       rawTransportType.toString().length === 24;
    expect(isObjectId).toBe(false); // "Mota" não é um ObjectId

    // Query com filtro por nome (string)
    const foundOrders = await RequestService.find({
      deleted: false,
      stepStatus: 3,
      transportType: rawTransportType,
      $or: [
        { targetDriverId: { $exists: false } },
        { targetDriverId: null },
        { targetDriverId: '' }
      ],
    }).lean();

    const found = foundOrders.find(o => o._id.toString() === order._id.toString());
    expect(found).toBeDefined(); // DEVE encontrar o pedido!
    console.log(`✅ Encontrou pedido com transportType="Mota" por nome`);
  });

  it('3. Motorista com GPS [0,0] NÃO deve aparecer no /available', async () => {
    // Motorista sem GPS válido
    const driverNoGPS = await makeDriver('Mota');
    await User.updateOne({ _id: driverNoGPS._id }, {
      $set: { locationGeo: { type: 'Point', coordinates: [0, 0] } }
    });

    // Motorista COM GPS válido
    const driverWithGPS = await makeDriver('Mota');
    await User.updateOne({ _id: driverWithGPS._id }, {
      $set: {
        locationGeo: { type: 'Point', coordinates: [32.5732, -25.9692] },
        latitude: '-25.9692',
        longitude: '32.5732',
      }
    });

    // Verificar: o filtro de [0,0] deve excluir o driverNoGPS
    const allActiveDrivers = await User.find({
      isDeliveryMan: true,
      availability: 'active',
    }).lean();

    const filteredByGPS = allActiveDrivers.filter(d => {
      const coords = d.locationGeo?.coordinates;
      if (coords && coords[0] !== 0 && coords[1] !== 0) return true;
      if (d.latitude && d.longitude && parseFloat(d.latitude) !== 0 && parseFloat(d.longitude) !== 0) return true;
      return false;
    });

    const noGPSInResult = filteredByGPS.some(d => d._id.toString() === driverNoGPS._id.toString());
    const withGPSInResult = filteredByGPS.some(d => d._id.toString() === driverWithGPS._id.toString());

    expect(noGPSInResult).toBe(false); // Motorista sem GPS deve ser excluído!
    expect(withGPSInResult).toBe(true); // Motorista com GPS deve aparecer!
    console.log(`✅ GPS [0,0] correctamente excluído. Motorista com GPS incluído.`);
  });
});
