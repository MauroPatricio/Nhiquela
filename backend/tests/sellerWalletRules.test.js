import 'dotenv/config';
import mongoose from 'mongoose';
import Order from '../models/OrderModel.js';
import User from '../models/UserModel.js';
import Provider from '../models/ProviderModel.js';
import Wallet from '../models/WalletModel.js';
import Transaction from '../models/TransactionModel.js';
import Settings from '../models/SettingsModel.js';
import { 
  processSellerOrderFinancials, 
  reverseSellerOrderFinancials,
  getWallet
} from '../services/walletService.js';

describe('Seller Wallet and Financial Rules', () => {
  let sellerUserId, providerId;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI);
  }, 60000);

  afterAll(async () => {
    await mongoose.connection.close();
  }, 60000);

  beforeEach(async () => {
    // Clean up
    await Order.deleteMany({});
    await User.deleteMany({});
    await Provider.deleteMany({});
    await Wallet.deleteMany({});
    await Transaction.deleteMany({});
    await Settings.deleteMany({});

    // Create default settings
    await Settings.create([
      { key: 'minimum_recommended_balance', value: '50', type: 'number' },
      { key: 'platform_commission_rate', value: '15', type: 'number' },
      { key: 'enable_first_sale_free', value: 'true', type: 'boolean' },
      { key: 'free_sales_count', value: '1', type: 'number' },
      { key: 'block_store_below_minimum', value: 'true', type: 'boolean' },
      { key: 'allow_negative_balance', value: 'false', type: 'boolean' }
    ]);

    // Create Seller User
    const sellerUser = new User({
      name: 'Seller Account',
      email: `seller_${Date.now()}@test.com`,
      password: 'password',
      phoneNumber: 840000000 + Math.floor(Math.random() * 100000),
      isSeller: true,
      seller: {
        name: 'Seller Shop',
        openstore: true,
        storeStatus: 'OPEN',
        free_sale_available: true,
        free_sale_used: false
      }
    });
    await sellerUser.save();
    sellerUserId = sellerUser._id;

    // Create Provider
    const provider = new Provider({
      name: 'Seller Shop Provider',
      userId: sellerUserId,
      providerType: 'Store'
    });
    await provider.save();
    providerId = provider._id;
  }, 60000);

  test('Should process first sale as free (0 commission) and mark promotion as used upon completion', async () => {
    const order = new Order({
      code: 'ORDER1',
      user: new mongoose.Types.ObjectId(),
      seller: providerId,
      totalPrice: 1000,
      paymentMethod: 'M-Pesa',
      status: 'Pendente',
      isDelivered: false,
      isCommissionProcessed: false
    });
    await order.save();
    await Order.updateOne({ _id: order._id }, { $set: { status: 'Entregue', isDelivered: true } });

    const result = await processSellerOrderFinancials(order._id);
    expect(result.success).toBe(true);
    expect(result.isFreeSale).toBe(true);
    expect(result.commissionAmount).toBe(0);

    // Verify wallet balance (remains 0 MT because sales do not credit prepaid wallet)
    const wallet = await getWallet(sellerUserId, 'seller');
    expect(wallet.balance).toBe(0);

    // Verify promotion was consumed
    const updatedUser = await User.findById(sellerUserId);
    expect(updatedUser.seller.free_sale_available).toBe(false);
    expect(updatedUser.seller.free_sale_used).toBe(true);

    // Verify transaction logs
    const txs = await Transaction.find({ walletId: wallet._id });
    expect(txs.length).toBe(1);
    expect(txs[0].transaction_type).toBe('COMMISSION');
    expect(txs[0].amount).toBe(0);
  }, 60000);

  test('Should debit platform commission from seller wallet for sales when free sale is not available', async () => {
    // Disallow first sale free to test commission calculation
    await User.updateOne({ _id: sellerUserId }, { $set: { 'seller.free_sale_available': false } });

    // Seed wallet with prepaid top-up balance (e.g. 200 MT)
    const wallet = await getWallet(sellerUserId, 'seller');
    wallet.balance = 200;
    await wallet.save();

    const order = new Order({
      code: 'ORDER2',
      user: new mongoose.Types.ObjectId(),
      seller: providerId,
      totalPrice: 1000,
      paymentMethod: 'M-Pesa',
      status: 'Pendente',
      isDelivered: false,
      isCommissionProcessed: false
    });
    await order.save();
    await Order.updateOne({ _id: order._id }, { $set: { status: 'Entregue', isDelivered: true } });

    const result = await processSellerOrderFinancials(order._id);
    expect(result.success).toBe(true);
    expect(result.isFreeSale).toBe(false);
    expect(result.commissionAmount).toBe(150);

    // Verify wallet balance: 200 - 150 commission = 50 MT
    const updatedWallet = await getWallet(sellerUserId, 'seller');
    expect(updatedWallet.balance).toBe(50);

    // Verify ledger records
    const txs = await Transaction.find({ walletId: wallet._id });
    expect(txs.length).toBe(1);
    expect(txs[0].transaction_type).toBe('COMMISSION');
    expect(txs[0].amount).toBe(150);
  }, 60000);

  test('Should debit platform commission from seller wallet for Cash on Delivery (COD) orders', async () => {
    // Disable free sale promotion
    await User.updateOne({ _id: sellerUserId }, { $set: { 'seller.free_sale_available': false } });

    // Seed wallet with some funds (e.g. 200 MT) to cover the commission
    const wallet = await getWallet(sellerUserId, 'seller');
    wallet.balance = 200;
    await wallet.save();

    const order = new Order({
      code: 'ORDER3',
      user: new mongoose.Types.ObjectId(),
      seller: providerId,
      totalPrice: 1000,
      paymentMethod: 'Dinheiro',
      status: 'Pendente',
      isDelivered: false,
      isCommissionProcessed: false
    });
    await order.save();
    await Order.updateOne({ _id: order._id }, { $set: { status: 'Entregue', isDelivered: true } });

    const result = await processSellerOrderFinancials(order._id);
    expect(result.success).toBe(true);
    expect(result.commissionAmount).toBe(150);

    const updatedWallet = await getWallet(sellerUserId, 'seller');
    expect(updatedWallet.balance).toBe(50); // 200 - 150 commission

    // Verify transaction logs
    const txs = await Transaction.find({ walletId: wallet._id });
    expect(txs.length).toBe(1);
    expect(txs[0].transaction_type).toBe('COMMISSION');
    expect(txs[0].amount).toBe(150);
  }, 60000);

  test('Should reject COD commission debit if wallet has insufficient balance (no negative balance allowed)', async () => {
    await User.updateOne({ _id: sellerUserId }, { $set: { 'seller.free_sale_available': false } });

    // Wallet balance is 0. Commission is 150 MT.
    const order = new Order({
      code: 'ORDER4',
      user: new mongoose.Types.ObjectId(),
      seller: providerId,
      totalPrice: 1000,
      paymentMethod: 'Dinheiro',
      status: 'Pendente',
      isDelivered: false,
      isCommissionProcessed: false
    });
    await order.save();
    await Order.updateOne({ _id: order._id }, { $set: { status: 'Entregue', isDelivered: true } });

    await expect(processSellerOrderFinancials(order._id)).rejects.toThrow('TRANSACTION_REJECTED');

    // Wallet balance should remain 0
    const wallet = await getWallet(sellerUserId, 'seller');
    expect(wallet.balance).toBe(0);
  }, 60000);

  test('Should automatically close store (CLOSED_LOW_BALANCE) when balance falls below minimum', async () => {
    await User.updateOne({ _id: sellerUserId }, { $set: { 'seller.free_sale_available': false } });

    // Wallet balance is 100 MT. Commission is 70 MT. Resulting balance will be 30 MT, which is < 50 MT (min).
    const wallet = await getWallet(sellerUserId, 'seller');
    wallet.balance = 100;
    await wallet.save();

    const order = new Order({
      code: 'ORDER5',
      user: new mongoose.Types.ObjectId(),
      seller: providerId,
      totalPrice: 466.67, // 15% is approx 70 MT
      paymentMethod: 'Dinheiro',
      status: 'Pendente',
      isDelivered: false,
      isCommissionProcessed: false
    });
    await order.save();
    await Order.updateOne({ _id: order._id }, { $set: { status: 'Finalizado', isDelivered: true } });

    await processSellerOrderFinancials(order._id);

    // Wait for background checkAndDisableSellerIfLowBalance to execute
    await new Promise(resolve => setTimeout(resolve, 500));

    const updatedUser = await User.findById(sellerUserId);
    expect(updatedUser.seller.openstore).toBe(false);
    expect(updatedUser.seller.storeStatus).toBe('CLOSED_LOW_BALANCE');
  }, 60000);

  test('Should restore free sale promotion and reverse ledger entries on refund/cancellation', async () => {
    // 1. Process free sale order
    const order = new Order({
      code: 'ORDER6',
      user: new mongoose.Types.ObjectId(),
      seller: providerId,
      totalPrice: 1000,
      paymentMethod: 'M-Pesa',
      status: 'Pendente',
      isDelivered: false,
      isCommissionProcessed: false
    });
    await order.save();
    await Order.updateOne({ _id: order._id }, { $set: { status: 'Entregue', isDelivered: true } });

    await processSellerOrderFinancials(order._id);

    let userObj = await User.findById(sellerUserId);
    expect(userObj.seller.free_sale_used).toBe(true);

    // 2. Cancel/Refund the order
    await Order.updateOne({ _id: order._id }, { $set: { status: 'Cancelado', isDelivered: false } });

    await reverseSellerOrderFinancials(order._id);

    // Verify promotion was restored
    userObj = await User.findById(sellerUserId);
    expect(userObj.seller.free_sale_available).toBe(true);
    expect(userObj.seller.free_sale_used).toBe(false);

    // Verify wallet balance is back to 0
    const wallet = await getWallet(sellerUserId, 'seller');
    expect(wallet.balance).toBe(0);
  }, 60000);
});
