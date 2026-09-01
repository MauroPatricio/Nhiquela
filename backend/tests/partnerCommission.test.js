import 'dotenv/config';
import mongoose from 'mongoose';
import Partner from '../models/PartnerModel.js';
import Wallet from '../models/WalletModel.js';
import Transaction from '../models/TransactionModel.js';
import { debitCommissionFromPartner } from '../services/walletService.js';

describe('Partner Commission Collection', () => {
  let partnerId;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI);

    // Create a Partner
    const partner = new Partner({
      name: 'Loja Test',
      email: `loja_${Date.now()}@test.com`,
      password: 'password',
      phoneNumber: 840000000 + Math.floor(Math.random() * 10000),
      minBalance: 2000,
      accumulatedCommission: 0,
      salesDay: 0,
      salesMonth: 0
    });
    await partner.save();
    partnerId = partner._id;

    // Create a Wallet for the partner
    const wallet = new Wallet({
      ownerType: 'partner',
      ownerId: partnerId,
      userId: partnerId, // Used interchangeably in some older schema definitions
      balance: 5000,
      currency: 'MZN'
    });
    await wallet.save();
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  it('should deduct commission, update partner sales aggregates and create a transaction log', async () => {
    const orderAmount = 1000;
    const commissionRate = 0.15; // 15%
    const expectedCommission = 150;

    await debitCommissionFromPartner(partnerId, orderAmount, commissionRate);

    // Verify Wallet Balance
    const wallet = await Wallet.findOne({ ownerId: partnerId });
    expect(wallet.balance).toBe(5000 - expectedCommission); // 4850

    // Verify Partner Sales Aggregates
    const partner = await Partner.findById(partnerId);
    expect(partner.accumulatedCommission).toBe(expectedCommission); // 150
    expect(partner.salesDay).toBe(orderAmount); // 1000
    expect(partner.salesMonth).toBe(orderAmount); // 1000
    expect(partner.isActive).toBe(true); // Since balance 4850 >= 2000

    // Verify Transaction Log
    const transaction = await Transaction.findOne({ walletId: wallet._id, type: 'debit' });
    expect(transaction).toBeDefined();
    expect(transaction.amount).toBe(expectedCommission);
    expect(transaction.description).toContain(`Comissão sobre venda de ${orderAmount}`);
  });
});
