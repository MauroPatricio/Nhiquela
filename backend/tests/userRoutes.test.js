// tests/userRoutes.test.js
// Integration tests for user authentication (signup, signin)
// Requires MongoDB Atlas IP whitelisted.

import request from 'supertest';
import app from '../index.js'; // connects Mongoose to Atlas as side effect
import User from '../models/UserModel.js';

// Unique test email/phone prefix to avoid conflicts with real data
const TEST_EMAIL = 'jest_test_user@nhiquela-test.com';
const TEST_PHONE = 845888001;

beforeAll(async () => {
  // Wait for Mongoose to connect (index.js does this async)
  await new Promise(resolve => setTimeout(resolve, 6000));
  await User.deleteMany({ email: { $regex: /@nhiquela-test\.com$/ } });
}, 25000);

afterAll(async () => {
  await User.deleteMany({ email: { $regex: /@nhiquela-test\.com$/ } });
}, 15000);

afterEach(async () => {
  await User.deleteMany({ email: { $regex: /@nhiquela-test\.com$/ } });
}, 10000);

const baseUser = {
  name: 'Jest Test User',
  email: TEST_EMAIL,
  password: 'senha123',
  phoneNumber: TEST_PHONE,
};

describe('POST /api/users/signup', () => {
  it('should register a new user and return a token', async () => {
    const res = await request(app)
      .post('/api/users/signup')
      .send(baseUser);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.email).toBe(TEST_EMAIL);
  }, 15000);

  it('should fail with 400+ if email already exists', async () => {
    await request(app).post('/api/users/signup').send(baseUser);
    const res = await request(app).post('/api/users/signup').send(baseUser);
    expect(res.status).toBeGreaterThanOrEqual(400);
  }, 15000);

  it('should fail with 400+ if required fields are missing', async () => {
    const res = await request(app)
      .post('/api/users/signup')
      .send({ name: 'NoPhone No Email' });
    expect(res.status).toBeGreaterThanOrEqual(400);
  }, 15000);
});

describe('POST /api/users/signin', () => {
  it('should login with correct credentials and return a token', async () => {
    await request(app).post('/api/users/signup').send(baseUser);

    const res = await request(app)
      .post('/api/users/signin')
      .send({ phoneNumber: TEST_PHONE, password: baseUser.password });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
  }, 15000);

  it('should return 400+ with wrong password', async () => {
    await request(app).post('/api/users/signup').send(baseUser);

    const res = await request(app)
      .post('/api/users/signin')
      .send({ phoneNumber: TEST_PHONE, password: 'wrongpassword' });

    expect(res.status).toBeGreaterThanOrEqual(400);
  }, 15000);

  it('should return 400+ when user does not exist', async () => {
    const res = await request(app)
      .post('/api/users/signin')
      .send({ phoneNumber: 800000099, password: 'doesntmatter' });

    expect(res.status).toBeGreaterThanOrEqual(400);
  }, 15000);
});

describe('DELETE /api/users/profile', () => {
  it('should soft delete the user account and obfuscate email/phone', async () => {
    // 1. Register a user
    const registerRes = await request(app).post('/api/users/signup').send(baseUser);
    const token = registerRes.body.token;

    // 2. Delete the profile
    const deleteRes = await request(app)
      .delete('/api/users/profile')
      .set('Authorization', `Bearer ${token}`);

    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.message).toMatch(/Conta eliminada com sucesso/);

    // 3. Verify in DB
    const deletedUser = await User.findById(registerRes.body._id);
    expect(deletedUser.isDeleted).toBe(true);
    expect(deletedUser.isBanned).toBe(true);
    expect(deletedUser.email).toMatch(/^deleted_/);
    expect(deletedUser.phoneNumber).toBeLessThan(0);
  }, 15000);
});
