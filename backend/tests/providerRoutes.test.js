import request from 'supertest';
import mongoose from 'mongoose';
import app from '../index.js';
import User from '../models/UserModel.js';
import Provider from '../models/ProviderModel.js';
import { generateToken } from '../utils.js';

describe('Provider Routes Integration Tests', () => {
  let dbConnection;
  let testUser;
  let authToken;
  let testProvider;

  beforeAll(async () => {
    // Wait for the mongoose connection to be ready if it's already connecting,
    // or just use the current connection since setup.js handles MongoMemoryServer connection.
    dbConnection = mongoose.connection;
  });

  beforeEach(async () => {
    // Clean up collections
    await User.deleteMany({});
    await Provider.deleteMany({});

    // Create a mock user
    testUser = new User({
      name: 'Test Provider Owner',
      email: 'owner@test.com',
      password: 'password123',
      phoneNumber: 999999999,
      isSeller: true,
      isApproved: true
    });
    await testUser.save();

    authToken = generateToken(testUser);

    // Create a mock provider
    testProvider = new Provider({
      name: 'Central Test Store',
      providerType: 'BUSINESS',
      ownerId: testUser._id,
      status: 'active',
      verificationStatus: 'approved',
      location: {
        address: 'Av. Test 123',
        lat: -25.96,
        lng: 32.58
      },
      businessData: {
        description: 'Test description',
        openTime: '08:00',
        closeTime: '18:00'
      }
    });
    await testProvider.save();
  });

  describe('GET /api/providers', () => {
    it('should retrieve list of all providers', async () => {
      const res = await request(app)
        .get('/api/providers')
        .expect(200);

      expect(res.body.providers).toBeDefined();
      expect(res.body.providers.length).toBe(1);
      expect(res.body.providers[0].name).toBe('Central Test Store');
    });

    it('should filter providers by type', async () => {
      const res = await request(app)
        .get('/api/providers?type=SERVICE')
        .expect(200);

      expect(res.body.providers.length).toBe(0);
    });
  });

  describe('GET /api/providers/:id', () => {
    it('should retrieve a provider by ID', async () => {
      const res = await request(app)
        .get(`/api/providers/${testProvider._id}`)
        .expect(200);

      expect(res.body.provider).toBeDefined();
      expect(res.body.provider.name).toBe('Central Test Store');
    });

    it('should return 404 for non-existent provider ID', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      await request(app)
        .get(`/api/providers/${nonExistentId}`)
        .expect(404);
    });
  });

  describe('POST /api/providers', () => {
    it('should create a new provider when authenticated', async () => {
      const newProviderData = {
        name: 'New Test Business',
        providerType: 'BUSINESS',
        location: {
          address: 'St. Paul 456',
          lat: -25.95,
          lng: 32.57
        },
        businessData: {
          description: 'A great business',
          openTime: '09:00',
          closeTime: '21:00'
        }
      };

      const res = await request(app)
        .post('/api/providers')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newProviderData)
        .expect(201);

      expect(res.body.provider).toBeDefined();
      expect(res.body.provider.name).toBe('New Test Business');
      expect(res.body.provider.ownerId.toString()).toBe(testUser._id.toString());
    });

    it('should fail with 401 if token is not provided', async () => {
      await request(app)
        .post('/api/providers')
        .send({ name: 'Unauthorized Store', providerType: 'BUSINESS' })
        .expect(401);
    });
  });

  describe('PUT /api/providers/:id', () => {
    it('should update the provider if owner is making the request', async () => {
      const updateData = {
        name: 'Updated Central Store Name',
        businessData: {
          description: 'Updated test description'
        }
      };

      const res = await request(app)
        .put(`/api/providers/${testProvider._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(res.body.provider.name).toBe('Updated Central Store Name');
      expect(res.body.provider.businessData.description).toBe('Updated test description');
    });

    it('should fail with 403 if user is not the owner of the provider', async () => {
      const otherUser = new User({
        name: 'Other User',
        email: 'other@test.com',
        password: 'password123',
        phoneNumber: 888888888
      });
      await otherUser.save();
      const otherToken = generateToken(otherUser);

      await request(app)
        .put(`/api/providers/${testProvider._id}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ name: 'Hijacked Store Name' })
        .expect(403);
    });
  });
});
