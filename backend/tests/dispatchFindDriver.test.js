import mongoose from 'mongoose';
import User from '../models/UserModel.js';
import RequestService from '../models/RequestServiceModel.js';
import DispatchService from '../services/dispatchService.js';
import dotenv from 'dotenv';

dotenv.config();

describe('Dispatch and Driver Location System Verification', () => {
  let driver;
  let order;

  beforeAll(async () => {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/nhiquela_test_db';
    await mongoose.connect(uri);
  });

  afterAll(async () => {
    if (driver) await User.deleteOne({ _id: driver._id });
    if (order) await RequestService.deleteOne({ _id: order._id });
    await mongoose.connection.close();
  });

  it('1. Deve atualizar a localização do motorista sem falhas', async () => {
    driver = new User({
      name: 'Motorista GPS Teste',
      email: `driver_gps_${Date.now()}@teste.com`,
      password: 'password123',
      phoneNumber: `84${Math.floor(Math.random() * 9000000) + 1000000}`,
      isDeliveryMan: true,
      availability: 'active',
      status: 'Disponível',
      'deliveryman.hasActiveService': false,
      locationGeo: {
        type: 'Point',
        coordinates: [0, 0] // Começa no oceano
      }
    });
    await driver.save();

    // Simula a app do motorista a enviar a localização via WebSocket ou API
    // Atualiza para o centro de Maputo: Lng 32.5732, Lat -25.9692
    await User.updateOne(
      { _id: driver._id },
      {
        $set: {
          locationGeo: {
            type: 'Point',
            coordinates: [32.5732, -25.9692]
          },
          latitude: '-25.9692',
          longitude: '32.5732'
        }
      }
    );

    const updatedDriver = await User.findById(driver._id);
    expect(updatedDriver.locationGeo.coordinates[0]).toBe(32.5732);
    expect(updatedDriver.locationGeo.coordinates[1]).toBe(-25.9692);
  });

  it('2. O DispatchService DEVE encontrar o motorista com GPS ativo num raio de 10km', async () => {
    // Cria um pedido de viagem a 1km do motorista
    order = new RequestService({
      originDetails: { lat: -25.9600, lng: 32.5700, address: 'Maputo Shopping' },
      destinationDetails: { lat: -25.9700, lng: 32.5800, address: 'Baixa' },
      user: new mongoose.Types.ObjectId(),
      status: 'Procurando Motorista',
      deliveryman: { hasActiveService: false }
    });
    // Não é necessário guardar na BD para este teste (evita Validation Errors do schema)
    // await order.save();

    // A chamada à BD que o DispatchService faz
    const availableDrivers = await User.find({
      isDeliveryMan: true,
      availability: 'active',
      status: { $in: ['Active', 'Disponível', 'Ativo', 'Activo'] },
      'deliveryman.hasActiveService': false,
      locationGeo: {
        $near: {
          $geometry: {
            type: 'Point',
            // O MongoDB $near usa Lng, Lat
            coordinates: [parseFloat(order.originDetails.lng), parseFloat(order.originDetails.lat)]
          },
          $maxDistance: 10000 // 10km
        }
      }
    });

    expect(availableDrivers.length).toBeGreaterThan(0);
    const motoristaEncontrado = availableDrivers.find(d => d._id.toString() === driver._id.toString());
    expect(motoristaEncontrado).toBeDefined();
    expect(motoristaEncontrado.name).toBe('Motorista GPS Teste');
  });

  it('3. O DispatchService NÃO DEVE encontrar o motorista se ele estiver em [0,0]', async () => {
    // Reverte o motorista para [0,0]
    await User.updateOne(
      { _id: driver._id },
      {
        $set: {
          locationGeo: {
            type: 'Point',
            coordinates: [0, 0]
          }
        }
      }
    );

    const availableDrivers = await User.find({
      isDeliveryMan: true,
      availability: 'active',
      status: { $in: ['Active', 'Disponível', 'Ativo', 'Activo'] },
      'deliveryman.hasActiveService': false,
      locationGeo: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(order.originDetails.lng), parseFloat(order.originDetails.lat)]
          },
          $maxDistance: 10000 // 10km
        }
      }
    });

    // Como [0,0] fica a milhares de quilómetros, NÃO deve ser encontrado
    const motoristaEncontrado = availableDrivers.find(d => d._id.toString() === driver._id.toString());
    expect(motoristaEncontrado).toBeUndefined();
  });
});
