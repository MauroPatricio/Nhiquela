import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Order from './models/OrderModel.js';
import RequestDeliver from './models/RequestDeliverModel.js';

async function testDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB');

    const orders = await Order.find().sort({ createdAt: -1 }).limit(1).lean();
    const requests = await RequestDeliver.find().sort({ createdAt: -1 }).limit(1).lean();

    console.log('Latest Order:', orders.length ? orders[0]._id : 'None');
    console.log('Latest RequestDeliver:', requests.length ? requests[0]._id : 'None');

    // Simulate what /deliveryman/all does
    console.log('Testing unified mapping logic...');
    
    const normalizeOrder = (o) => ({
      ...o,
      isRequestDeliver: false,
    });

    const normalizeRequest = (r) => ({
      ...r,
      _id: r._id,
      isRequestDeliver: true,
      orderItems: r.deliveryItems,
      shippingAddress: {
        address: r.pickupAddress.address,
        lat: r.pickupAddress.latitude,
        lng: r.pickupAddress.longitude
      },
      deliveryAddress: {
        address: r.deliveryAddress.address,
        lat: r.deliveryAddress.latitude,
        lng: r.deliveryAddress.longitude
      },
      deliveryman: r.deliveryman,
      totalPrice: r.estimatedPrice || r.deliveryFee,
      isPaid: r.isPaid,
      status: r.status,
      stepStatus: r.stepStatus,
      createdAt: r.createdAt
    });

    const unified = [
      ...(orders.map(normalizeOrder)),
      ...(requests.map(normalizeRequest))
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    console.log(`Unified list has ${unified.length} items.`);
    if (unified.length > 0) {
      console.log('First item fields:', Object.keys(unified[0]).join(', '));
      console.log('Deliveryman field:', unified[0].deliveryman ? 'Exists' : 'Null');
      console.log('isRequestDeliver:', unified[0].isRequestDeliver);
    }
    
    mongoose.disconnect();
    console.log('Test completed successfully.');
  } catch (error) {
    console.error(error);
  }
}

testDatabase();
