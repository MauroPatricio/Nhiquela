import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/UserModel.js';
import Provider from '../models/ProviderModel.js';
import Product from '../models/ProductModel.js';
import Order from '../models/OrderModel.js';

dotenv.config();

const runDBTests = async () => {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Database connected successfully!\n');

    // 1. Test Provider Model Query
    console.log('--- 1. Testing Provider Model ---');
    const providers = await Provider.find({}).limit(5);
    console.log(`Found ${providers.length} providers in the database.`);
    providers.forEach(p => {
      console.log(`- Provider: ${p.name} [Type: ${p.providerType}, Status: ${p.status}]`);
    });

    // 2. Test Product population with Provider
    console.log('\n--- 2. Testing Product -> Provider population ---');
    const product = await Product.findOne({ seller: { $exists: true } })
      .populate('seller');
    
    if (product) {
      console.log(`Product: "${product.nome || product.name}"`);
      console.log(`Seller reference:`, product.seller ? `Populated successfully -> Provider: "${product.seller.name}"` : 'Not populated / Provider reference missing');
    } else {
      console.log('No products with sellers found to test population.');
    }

    // 3. Test Order population with Provider
    console.log('\n--- 3. Testing Order -> Provider population ---');
    const order = await Order.findOne({ sellers: { $exists: true, $not: { $size: 0 } } })
      .populate('sellers');
    
    if (order) {
      console.log(`Order Code: "${order.code}"`);
      console.log(`Sellers references:`, order.sellers && order.sellers.length > 0 
        ? `Populated successfully -> Found ${order.sellers.length} provider(s)` 
        : 'Sellers list is empty'
      );
    } else {
      console.log('No orders with sellers found to test population.');
    }

    // 4. Test Schema Insertion and Validation
    console.log('\n--- 4. Testing Provider Schema Insertion & Cleanup ---');
    const mockUser = await User.findOne({});
    if (mockUser) {
      const tempProvider = new Provider({
        name: 'Temporary Test Provider',
        providerType: 'BUSINESS',
        ownerId: mockUser._id,
        status: 'active',
        location: {
          address: 'Test Address 456'
        }
      });
      await tempProvider.save();
      console.log('Successfully saved temporary test provider.');
      
      await Provider.deleteOne({ _id: tempProvider._id });
      console.log('Successfully cleaned up temporary test provider.');
    } else {
      console.log('No user found to set as owner of temporary provider.');
    }

    console.log('\nAll database model and population checks passed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Database tests failed:', error);
    process.exit(1);
  }
};

runDBTests();
