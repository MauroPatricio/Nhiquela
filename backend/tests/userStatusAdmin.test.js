import request from 'supertest';
import app from '../index.js';
import User from '../models/UserModel.js';
import { generateToken } from '../utils.js';
import { connectTestDB, disconnectTestDB } from './setup.js';

const TEST_EMAIL = 'admin_status_test@nhiquela-test.com';
const ADMIN_EMAIL = 'admin_master_test@nhiquela-test.com';

let adminToken;
let testUserId;

beforeAll(async () => {
  await connectTestDB();
  await User.deleteMany({ email: { $in: [TEST_EMAIL, ADMIN_EMAIL] } });

  // Create an admin user for token
  const adminUser = new User({
    name: 'Admin Master',
    email: ADMIN_EMAIL,
    password: 'password123',
    isAdmin: true,
    phoneNumber: 999999999
  });
  await adminUser.save();
  adminToken = generateToken(adminUser);

  // Create a regular user to test
  const testUser = new User({
    name: 'Target User',
    email: TEST_EMAIL,
    password: 'password123',
    phoneNumber: 888888888,
    isApproved: false,
    isBanned: false
  });
  const savedUser = await testUser.save();
  testUserId = savedUser._id;
}, 25000);

afterAll(async () => {
  await User.deleteMany({ email: { $in: [TEST_EMAIL, ADMIN_EMAIL] } });
  // Also delete by regex in case the email was mangled by soft delete
  await User.deleteMany({ email: { $regex: /admin_status_test/ } });
  await disconnectTestDB();
}, 15000);

describe('Admin User Status Management', () => {
  it('should activate (authorize) a user successfully', async () => {
    const res = await request(app)
      .put(`/api/users/${testUserId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isApproved: true });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Utilizador Actualizado Com Sucesso');

    const updatedUser = await User.findById(testUserId);
    expect(updatedUser.isApproved).toBe(true);
    expect(updatedUser.isBanned).toBe(false);
  }, 15000);

  it('should block (ban) a user successfully and verify API alignment', async () => {
    const res = await request(app)
      .put(`/api/users/${testUserId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isBanned: true });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Utilizador Actualizado Com Sucesso');

    // Verification 1: Check Database directly
    const updatedUser = await User.findById(testUserId);
    expect(updatedUser.isBanned).toBe(true);
    expect(updatedUser.isApproved).toBe(false);

    // Verification 2: Check API alignment (what the frontend sees)
    const getRes = await request(app).get('/api/users');
    expect(getRes.status).toBe(200);
    const targetUser = getRes.body.users.find(u => u._id === testUserId.toString());
    expect(targetUser).toBeDefined();
    expect(targetUser.isBanned).toBe(true);
    expect(targetUser.isApproved).toBe(false);
  }, 15000);

  it('should remove (soft delete) a user successfully and verify API alignment', async () => {
    const res = await request(app)
      .delete(`/api/users/${testUserId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/removido/i);

    // Verification 1: Check Database directly
    const deletedUser = await User.findById(testUserId);
    expect(deletedUser.isDeleted).toBe(true);
    expect(deletedUser.email).toMatch(/deleted_/);

    // Verification 2: Check API alignment (deleted users should NOT appear in GET /api/users)
    const getRes = await request(app).get('/api/users');
    expect(getRes.status).toBe(200);
    const targetUser = getRes.body.users.find(u => u._id === testUserId.toString());
    expect(targetUser).toBeUndefined(); // Should be filtered out by `isDeleted: { $ne: true }`
  }, 15000);
});
