import 'dotenv/config';
import mongoose from 'mongoose';
import User from './models/UserModel.js';
import RequestService from './models/RequestServiceModel.js';
import { generateToken } from './utils.js';
import axios from 'axios';

mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    try {
      const driver = await User.findOne({ isDeliveryMan: true });
      if (!driver) {
        console.log('No driver found');
        return;
      }
      const token = generateToken(driver);
      
      let order = await RequestService.findOne({ status: 'Pendente' }).sort({ createdAt: -1 });
      if (!order) {
        console.log('No pending order found. Creating a fake one...');
        const user = await User.findOne({ isDeliveryMan: false });
        order = new RequestService({
            user: user._id,
            status: 'Pendente',
            stepStatus: 1,
            initialLocationName: 'Test Location',
            code: 'TEST-1234',
            pricing: { costServico: 100, costDeslocacao: 50 }
        });
        await order.save();
      }
      
      console.log('Testing with Order ID:', order._id.toString());
      try {
        const response = await axios.put('http://localhost:5000/api/request-service/' + order._id.toString() + '/acceptedByDeliveryman', {}, {
          headers: { Authorization: 'Bearer ' + token }
        });
        console.log('Success:', response.data);
      } catch (err) {
        console.error('API Error:', err.response?.data || err.message);
      }
      
    } catch (e) {
      console.error('Script Error:', e);
    } finally {
      mongoose.disconnect();
    }
  });
