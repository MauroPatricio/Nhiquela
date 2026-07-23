import mongoose from 'mongoose';
import dotenv from 'dotenv';
import express from 'express';
import request from 'supertest';
import trackingRoutes from './routes/trackingRoutes.js';
import User from './models/UserModel.js';
import jwt from 'jsonwebtoken';

dotenv.config();

const app = express();
app.use(express.json());

const token = jwt.sign(
  { _id: '6a5e01ead01ee0c3a00faafe', name: 'New Driver', isAdmin: false },
  process.env.JWT_SECRET,
  { expiresIn: '30d' }
);

app.use('/api/tracking', trackingRoutes);

async function runTest() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB');

  let user = await User.findById('6a5e01ead01ee0c3a00faafe');
  console.log('Initial location:', user?.locationGeo);

  console.log('Sending tracking update without orderId...');
  const res = await request(app)
    .post('/api/tracking/update')
    .set('Authorization', `Bearer ${token}`)
    .send({
      orderId: null,
      latitude: -25.9692,
      longitude: 32.5732,
      speed: 15,
      heading: 90
    });

  console.log('API Response Status:', res.status);
  console.log('API Response Body:', res.body);

  user = await User.findById('6a5e01ead01ee0c3a00faafe');
  console.log('Final location:', user?.locationGeo);

  // Agora vamos testar a BUSCA!
  const availableDrivers = await User.find({
    isDeliveryMan: true,
    availability: 'active',
    status: { $in: ['Active', 'Disponível', 'Ativo', 'Activo'] },
    'deliveryman.hasActiveService': false,
    locationGeo: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [32.5732, -25.9692]
        },
        $maxDistance: 5000
      }
    }
  });

  console.log(`Drivers found by dispatcher: ${availableDrivers.length}`);
  if (availableDrivers.length > 0) {
    console.log('Driver Name:', availableDrivers[0].name);
  }

  process.exit();
}

runTest();
