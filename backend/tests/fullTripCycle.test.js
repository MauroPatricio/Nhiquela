import request from 'supertest';
import app from '../index.js';
import User from '../models/UserModel.js';
import RequestService from '../models/RequestServiceModel.js';
import Wallet from '../models/WalletModel.js';
import { generateToken } from '../utils.js';

let clientToken;
let driverToken;
let clientUser;
let driverUser;
let tripId;

beforeAll(async () => {
  // Allow time for Mongoose to connect
  await new Promise(resolve => setTimeout(resolve, 6000));

  // Clean up
  await User.deleteMany({ email: { $in: ['full_client@test.com', 'full_driver@test.com'] } });
  
  // 1. Create Client
  clientUser = await User.create({
    name: 'Full Trip Client',
    email: 'full_client@test.com',
    password: 'password123',
    phoneNumber: 840001111,
    isDeliveryMan: false,
    isAdmin: false,
  });
  clientToken = generateToken(clientUser);

  // 2. Create Driver
  driverUser = await User.create({
    name: 'Full Trip Driver',
    email: 'full_driver@test.com',
    password: 'password123',
    phoneNumber: 840002222,
    isDeliveryMan: true,
    isApproved: true,
    availability: 'active', // Changed to active
    status: 'Disponível',   // Changed to Disponível
    locationGeo: {
      type: 'Point',
      coordinates: [32.5731, -25.9614] // Near origin
    },
    deliveryman: {
      transport_type: 'Ligeiro'
    }
  });
  driverToken = generateToken(driverUser);

  // Create Wallet for Driver
  await Wallet.create({
    ownerId: driverUser._id,
    ownerType: 'driver',
    userId: driverUser._id,
    balance: 500,
    currency: 'MT'
  });

  // Clean up past trips for these users to avoid conflicts
  await RequestService.deleteMany({ user: clientUser._id });

}, 30000);

afterAll(async () => {
  await User.deleteMany({ email: { $in: ['full_client@test.com', 'full_driver@test.com'] } });
  await RequestService.deleteMany({ user: clientUser._id });
}, 15000);

describe('Full Trip Lifecycle Integration Test', () => {

  it('1. Client should successfully request a new trip', async () => {
    const res = await request(app)
      .post('/api/request-service/')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        name: 'Full Trip Client',
        phoneNumber: '840001111',
        deliverCity: 'Maputo',
        destination: 'Maputo Central',
        origin: 'Matola Rio',
        transportType: 'Ligeiro',
        goodType: 'Passageiro',
        price: 500, // Client proposed price
        deliveryPrice: 500,
        distance: '15 km',
        originDetails: { lat: -25.9614, lng: 32.5731 },
        destinationDetails: { lat: -25.9692, lng: 32.5832 },
        targetDriverId: driverUser._id // Direct request for this test
      });

    expect(res.status).toBeLessThan(400);
    expect(res.body).toHaveProperty('requestService');
    expect(res.body.requestService.status).toBe('Pendente');
    expect(res.body.requestService.user._id.toString()).toBe(clientUser._id.toString());
    
    tripId = res.body.requestService._id;
  }, 15000);

  it('2. Driver should accept the trip request', async () => {
    const res = await request(app)
      .put(`/api/request-service/${tripId}/acceptedByDeliveryman`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send();

    expect(res.status).toBeLessThan(400);
    
    const trip = await RequestService.findById(tripId);
    expect(trip.status).toBe('Aceite pelo entregador');
    expect(trip.isAccepted).toBe(true);
  });

  it('3. Driver should start the trip (In Transit)', async () => {
    const res = await request(app)
      .put(`/api/request-service/${tripId}/intransit`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send();

    expect(res.status).toBeLessThan(400);
    
    const trip = await RequestService.findById(tripId);
    expect(trip.status).toBe('Em trânsito');
    expect(trip.isInTransit).toBe(true);
  });

  it('4. Driver should mark arrived at destination', async () => {
    const res = await request(app)
      .put(`/api/request-service/${tripId}/confirmDestination`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ latitude: -25.9692, longitude: 32.5832 });

    expect(res.status).toBeLessThan(400);
    
    const trip = await RequestService.findById(tripId);
    expect(trip.status).toBe('No destino indicado');
  });

  it('5. Driver should complete the trip (Deliver)', async () => {
    const res = await request(app)
      .put(`/api/request-service/${tripId}/deliver`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send();

    expect(res.status).toBeLessThan(400);
    
    const trip = await RequestService.findById(tripId);
    expect(trip.status).toBe('Concluído');
    expect(trip.isDelivered).toBe(true);
  });

  it('6. Client should be able to submit a review for the trip', async () => {
    const res = await request(app)
      .post(`/api/request-service/${tripId}/rate`)
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        rating: 5,
        review: 'Ótima viagem!'
      });

    expect(res.status).toBeLessThan(400);
    
    const trip = await RequestService.findById(tripId);
    expect(trip.rating).toBe(5);
    expect(trip.review).toBe('Ótima viagem!');
  }, 15000);

});
